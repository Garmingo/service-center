import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { Transform } from "node:stream";

import { db } from "@service-center/db";
import {
  campaign,
  campaignRecipient,
  contact,
  importRecord,
  importRun,
  leadEligibility,
  mailingTemplate,
  senderAccount,
  suppression,
} from "@service-center/db/schema/service-center";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { pick } from "stream-json/filters/pick.js";
import { streamArray } from "stream-json/streamers/stream-array.js";
import { z } from "zod";

import { decryptSecret } from "./encryption";

const MAX_RECIPIENTS_PER_JOB = 50;
const MAX_IMAP_MESSAGES = 100;
const IMPORT_BATCH_SIZE = 100;

const smtpConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65_535).default(587),
  secure: z.boolean().optional(),
  user: z.string().min(1),
  password: z.string().min(1),
});

const imapConfigSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65_535).default(993),
  secure: z.boolean().default(true),
  user: z.string().min(1),
  password: z.string().min(1),
  mailbox: z.string().min(1).default("INBOX"),
});

const campaignSendPayloadSchema = z.object({
  campaignId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(MAX_RECIPIENTS_PER_JOB).optional(),
});

const imapSyncPayloadSchema = z.object({
  senderAccountId: z.string().min(1),
});

const importPayloadSchema = z.object({
  importRunId: z.string().min(1),
  filePath: z.string().min(1),
  format: z.enum(["json-array", "ndjson", "collection-map"]).default("json-array"),
  sourceCollection: z.string().min(1).optional(),
});

type SmtpConfig = z.infer<typeof smtpConfigSchema>;
type SenderAccount = typeof senderAccount.$inferSelect;
type MongoDocument = Record<string, unknown>;

export class JobNotReadyError extends Error {
  constructor(message: string, readonly retryAfterMs = 60_000) {
    super(message);
  }
}

function parseEncryptedConfig<T>(ciphertext: string, schema: z.ZodType<T>, kind: string): T {
  try {
    return schema.parse(JSON.parse(decryptSecret(ciphertext)));
  } catch (error) {
    throw new Error(`Invalid encrypted ${kind} configuration.`, { cause: error });
  }
}

async function getSenderAccount(senderAccountId: string, requireActive = true): Promise<SenderAccount> {
  const account = await db.query.senderAccount.findFirst({
    where: eq(senderAccount.id, senderAccountId),
  });

  if (!account) {
    throw new Error(`Sender account "${senderAccountId}" was not found.`);
  }
  if (requireActive && account.status !== "active") {
    throw new JobNotReadyError(`Sender account "${senderAccountId}" is not active.`, 5 * 60_000);
  }

  return account;
}

function createSmtpTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? config.port === 465,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
}

function renderTemplate(template: string, recipient: { firstName: string | null; lastName: string | null; email: string }) {
  const values: Record<string, string> = {
    email: recipient.email,
    firstName: recipient.firstName ?? "",
    lastName: recipient.lastName ?? "",
  };

  return template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

function asPlainText(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function dayStartInTimezone(timezone: string, now: Date) {
  try {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const parts = Object.fromEntries(date.map((part) => [part.type, part.value]));
    const localDate = `${parts.year}-${parts.month}-${parts.day}`;
    const offset = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value;
    const timezoneOffset = offset?.replace("GMT", "") || "+00:00";
    return new Date(`${localDate}T00:00:00${timezoneOffset}`);
  } catch {
    throw new Error(`Sender account has an invalid timezone "${timezone}".`);
  }
}

async function getAvailableSendCapacity(account: SenderAccount) {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const todayStart = dayStartInTimezone(account.timezone, now);
  const [hourly, daily] = await Promise.all([
    db
      .select({ value: count() })
      .from(campaignRecipient)
      .innerJoin(campaign, eq(campaignRecipient.campaignId, campaign.id))
      .where(and(eq(campaign.senderAccountId, account.id), gte(campaignRecipient.sentAt, hourAgo))),
    db
      .select({ value: count() })
      .from(campaignRecipient)
      .innerJoin(campaign, eq(campaignRecipient.campaignId, campaign.id))
      .where(and(eq(campaign.senderAccountId, account.id), gte(campaignRecipient.sentAt, todayStart))),
  ]);

  return Math.max(0, Math.min(account.hourlyLimit - hourly[0]!.value, account.dailyLimit - daily[0]!.value));
}

export async function processCampaignSend(payload: unknown) {
  const { campaignId, limit = MAX_RECIPIENTS_PER_JOB } = campaignSendPayloadSchema.parse(payload);
  const campaignRow = await db
    .select({
      id: campaign.id,
      status: campaign.status,
      senderAccountId: campaign.senderAccountId,
      subject: mailingTemplate.subject,
      body: mailingTemplate.body,
    })
    .from(campaign)
    .innerJoin(mailingTemplate, eq(campaign.templateId, mailingTemplate.id))
    .where(eq(campaign.id, campaignId))
    .then((rows) => rows[0]);

  if (!campaignRow) {
    throw new Error(`Campaign "${campaignId}" was not found.`);
  }
  if (!["active", "sending"].includes(campaignRow.status)) {
    throw new JobNotReadyError(`Campaign "${campaignId}" is not ready to send.`, 5 * 60_000);
  }

  const account = await getSenderAccount(campaignRow.senderAccountId);
  const capacity = await getAvailableSendCapacity(account);
  if (capacity === 0) {
    throw new JobNotReadyError(`Sender account "${account.id}" has reached its sending limit.`, 60 * 60_000);
  }

  const recipients = await db
    .select({
      id: campaignRecipient.id,
      contactId: campaignRecipient.contactId,
      renderedSubject: campaignRecipient.renderedSubject,
      renderedBody: campaignRecipient.renderedBody,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
    })
    .from(campaignRecipient)
    .innerJoin(contact, eq(campaignRecipient.contactId, contact.id))
    .where(and(eq(campaignRecipient.campaignId, campaignId), eq(campaignRecipient.status, "pending")))
    .limit(Math.min(limit, capacity));

  if (recipients.length === 0) {
    return;
  }

  const contactIds = recipients.map((recipient) => recipient.contactId);
  const emails = recipients.map((recipient) => recipient.email);
  const [eligibilityRows, suppressionRows] = await Promise.all([
    db
      .select({ contactId: leadEligibility.contactId, status: leadEligibility.status })
      .from(leadEligibility)
      .where(inArray(leadEligibility.contactId, contactIds)),
    db.select({ email: suppression.email }).from(suppression).where(inArray(suppression.email, emails)),
  ]);
  const eligibleContacts = new Set(
    eligibilityRows.filter((row) => row.status === "approved").map((row) => row.contactId),
  );
  const suppressedEmails = new Set(suppressionRows.map((row) => row.email));
  const deliverableRecipients = recipients.filter(
    (recipient) => eligibleContacts.has(recipient.contactId) && !suppressedEmails.has(recipient.email),
  );

  if (deliverableRecipients.length === 0) {
    return;
  }

  const transporter = createSmtpTransport(parseEncryptedConfig(account.smtpConfig, smtpConfigSchema, "SMTP"));
  try {
    await transporter.verify();
    for (const recipient of deliverableRecipients) {
      const [claimed] = await db
        .update(campaignRecipient)
        .set({ status: "sending", error: null })
        .where(and(eq(campaignRecipient.id, recipient.id), eq(campaignRecipient.status, "pending")))
        .returning({ id: campaignRecipient.id });

      if (!claimed) {
        continue;
      }

      const subject = recipient.renderedSubject ?? renderTemplate(campaignRow.subject, recipient);
      const html = recipient.renderedBody ?? renderTemplate(campaignRow.body, recipient);
      try {
        const info = await transporter.sendMail({
          from: { name: account.fromName, address: account.fromEmail },
          to: recipient.email,
          subject,
          html,
          text: asPlainText(html),
        });
        await db
          .update(campaignRecipient)
          .set({ status: "sent", messageId: info.messageId, sentAt: new Date(), error: null })
          .where(and(eq(campaignRecipient.id, recipient.id), eq(campaignRecipient.status, "sending")));
      } catch (error) {
        await db
          .update(campaignRecipient)
          .set({ status: "pending", error: error instanceof Error ? error.message.slice(0, 2_000) : "SMTP delivery failed" })
          .where(and(eq(campaignRecipient.id, recipient.id), eq(campaignRecipient.status, "sending")));
        throw error;
      }
    }
  } finally {
    transporter.close();
  }
}

function messageIdsFromHeaders(headers: string) {
  return [...headers.matchAll(/<(?:[^<>\s]+@[^<>\s]+)>/g)].map((match) => match[0].slice(1, -1));
}

export async function processImapSync(payload: unknown) {
  const { senderAccountId } = imapSyncPayloadSchema.parse(payload);
  const account = await getSenderAccount(senderAccountId);
  const config = parseEncryptedConfig(account.imapConfig, imapConfigSchema, "IMAP");
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      const unseen = await client.search({ seen: false });
      if (unseen === false) {
        return;
      }
      for (const uid of unseen.slice(-MAX_IMAP_MESSAGES)) {
        const message = await client.fetchOne(uid, { envelope: true, source: true }, { uid: true });
        if (!message || !message.source) {
          continue;
        }

        const headerEnd = message.source.indexOf("\r\n\r\n");
        const headers = message.source.subarray(0, headerEnd === -1 ? message.source.length : headerEnd).toString("utf8");
        const referencedMessageIds = messageIdsFromHeaders(headers);
        if (referencedMessageIds.length === 0) {
          continue;
        }

        const matchingRecipients = await db
          .select({ id: campaignRecipient.id })
          .from(campaignRecipient)
          .innerJoin(campaign, eq(campaignRecipient.campaignId, campaign.id))
          .where(
            and(
              eq(campaign.senderAccountId, account.id),
              eq(campaignRecipient.status, "sent"),
              inArray(campaignRecipient.messageId, referencedMessageIds),
            ),
          );
        if (matchingRecipients.length > 0) {
          await db
            .update(campaignRecipient)
            .set({ status: "replied", repliedAt: new Date() })
            .where(inArray(campaignRecipient.id, matchingRecipients.map((recipient) => recipient.id)));
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    if (client.usable) {
      await client.logout();
    }
  }
}

async function resolveImportFile(filePath: string) {
  const importRoot = await realpath(resolve(process.env.IMPORT_ROOT ?? "imports"));
  const resolvedFile = resolve(filePath);
  if (!isAbsolute(filePath) || relative(importRoot, resolvedFile).startsWith("..")) {
    throw new Error("Import file must be an absolute path inside IMPORT_ROOT.");
  }
  await access(resolvedFile);
  return resolvedFile;
}

function documentId(document: MongoDocument, index: number) {
  const id = document._id;
  if (typeof id === "string" || typeof id === "number") {
    return String(id);
  }
  if (id && typeof id === "object" && "$oid" in id && typeof id.$oid === "string") {
    return id.$oid;
  }
  return createHash("sha256").update(`${index}:${JSON.stringify(document)}`).digest("hex");
}

async function stageImportRecords(
  importRunId: string,
  sourceCollection: string,
  documents: AsyncIterable<unknown>,
) {
  let processed = 0;
  let rejected = 0;
  let batch: Array<typeof importRecord.$inferInsert> = [];

  const flush = async () => {
    if (batch.length === 0) {
      return;
    }
    await db.insert(importRecord).values(batch).onConflictDoNothing();
    await db
      .update(importRun)
      .set({
        processedRecords: processed,
        rejectedRecords: rejected,
        checkpoint: { sourceCollection, processed },
      })
      .where(eq(importRun.id, importRunId));
    batch = [];
  };

  for await (const value of documents) {
    processed += 1;
    const isDocument = Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const document = isDocument ? (value as MongoDocument) : { value };
    batch.push({
      id: randomUUID(),
      importRunId,
      sourceCollection,
      sourceId: documentId(document, processed),
      payload: document,
      validationError: isDocument ? null : "Expected a JSON object.",
    });
    if (!isDocument) {
      rejected += 1;
    }
    if (batch.length >= IMPORT_BATCH_SIZE) {
      await flush();
    }
  }
  await flush();
  return { processed, rejected };
}

async function* ndjsonDocuments(filePath: string): AsyncGenerator<unknown> {
  let remainder = "";
  const splitter = new Transform({
    transform(chunk, _encoding, callback) {
      const lines = `${remainder}${chunk.toString("utf8")}`.split(/\r?\n/);
      remainder = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) {
          this.push(line);
        }
      }
      callback();
    },
    flush(callback) {
      if (remainder.trim()) {
        this.push(remainder);
      }
      callback();
    },
  });
  const lines = createReadStream(filePath).pipe(splitter);
  for await (const line of lines) {
    yield JSON.parse(String(line));
  }
}

async function* jsonArrayDocuments(filePath: string): AsyncGenerator<unknown> {
  const input = createReadStream(filePath).pipe(streamArray.withParserAsStream());
  for await (const item of input) {
    yield (item as { value: unknown }).value;
  }
}

async function* collectionMapDocuments(filePath: string, sourceCollection: string): AsyncGenerator<unknown> {
  const input = createReadStream(filePath)
    .pipe(pick.withParserAsStream({ filter: sourceCollection }))
    .pipe(streamArray.asStream());
  for await (const item of input) {
    yield (item as { value: unknown }).value;
  }
}

export async function processLeadImport(payload: unknown) {
  const { importRunId, filePath, format, sourceCollection } = importPayloadSchema.parse(payload);
  const run = await db.query.importRun.findFirst({ where: eq(importRun.id, importRunId) });
  if (!run) {
    throw new Error(`Import run "${importRunId}" was not found.`);
  }
  const resolvedFile = await resolveImportFile(filePath);
  const collection = sourceCollection ?? run.source;

  await db
    .update(importRun)
    .set({ status: "running", startedAt: run.startedAt ?? new Date(), error: null })
    .where(eq(importRun.id, importRunId));

  try {
    if (format === "collection-map" && !sourceCollection) {
      throw new Error("collection-map imports require sourceCollection.");
    }
    const mapCollection = sourceCollection ?? "";
    const documents =
      format === "ndjson"
        ? ndjsonDocuments(resolvedFile)
        : format === "collection-map"
          ? collectionMapDocuments(resolvedFile, mapCollection)
          : jsonArrayDocuments(resolvedFile);
    const result = await stageImportRecords(importRunId, collection, documents);
    await db
      .update(importRun)
      .set({
        status: "completed",
        totalRecords: result.processed,
        processedRecords: result.processed,
        rejectedRecords: result.rejected,
        completedAt: new Date(),
      })
      .where(eq(importRun.id, importRunId));
  } catch (error) {
    await db
      .update(importRun)
      .set({
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 2_000) : "Import failed",
        completedAt: new Date(),
      })
      .where(eq(importRun.id, importRunId));
    throw error;
  }
}

export async function processSenderHealthCheck(payload: unknown) {
  const { senderAccountId } = imapSyncPayloadSchema.parse(payload);
  const account = await getSenderAccount(senderAccountId, false);
  const transporter = createSmtpTransport(parseEncryptedConfig(account.smtpConfig, smtpConfigSchema, "SMTP"));
  try {
    await transporter.verify();
  } finally {
    transporter.close();
  }
}
