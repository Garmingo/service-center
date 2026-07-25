import { randomUUID } from "node:crypto";

import { db } from "@service-center/db";
import { workerJob } from "@service-center/db/schema/service-center";
import { and, eq, isNull, lte, or } from "drizzle-orm";

import {
  JobNotReadyError,
  processCampaignSend,
  processImapSync,
  processLeadImport,
  processSenderHealthCheck,
} from "./processors";

const workerId = process.env.WORKER_ID ?? `worker-${randomUUID()}`;
const pollIntervalMs = 1_000;
const lockTimeoutMs = 10 * 60_000;

type Job = typeof workerJob.$inferSelect;

async function claimJob(): Promise<Job | null> {
  const now = new Date();
  const staleLock = new Date(now.getTime() - lockTimeoutMs);
  const candidate = await db.query.workerJob.findFirst({
    where: or(
      and(eq(workerJob.status, "queued"), lte(workerJob.runAt, now), or(isNull(workerJob.lockedAt), lte(workerJob.lockedAt, staleLock))),
      and(eq(workerJob.status, "running"), lte(workerJob.lockedAt, staleLock)),
    ),
    orderBy: (jobs, { asc }) => [asc(jobs.runAt), asc(jobs.createdAt)],
  });

  if (!candidate) {
    return null;
  }

  const [claimed] = await db
    .update(workerJob)
    .set({
      status: "running",
      lockedAt: now,
      lockedBy: workerId,
      attempts: candidate.attempts + 1,
    })
    .where(
      and(
        eq(workerJob.id, candidate.id),
        or(eq(workerJob.status, "queued"), and(eq(workerJob.status, "running"), lte(workerJob.lockedAt, staleLock))),
      ),
    )
    .returning();

  return claimed ?? null;
}

async function processJob(job: Job) {
  switch (job.type) {
    case "lead-import":
      await processLeadImport(job.payload);
      return;
    case "campaign-send":
      await processCampaignSend(job.payload);
      return;
    case "imap-sync":
      await processImapSync(job.payload);
      return;
    case "sender-health-check":
      await processSenderHealthCheck(job.payload);
      return;
    default:
      throw new Error(`Unknown worker job type "${job.type}".`);
  }
}

async function settleJob(job: Job, error?: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const shouldRetry = Boolean(error) && job.attempts < job.maxAttempts;
  const retryAfterMs = error instanceof JobNotReadyError ? error.retryAfterMs : 2 ** job.attempts * 30_000;

  await db
    .update(workerJob)
    .set(
      error
        ? {
            status: shouldRetry ? "queued" : "failed",
            runAt: shouldRetry ? new Date(Date.now() + retryAfterMs) : job.runAt,
            lockedAt: null,
            lockedBy: null,
            lastError: message,
          }
        : {
            status: "completed",
            lockedAt: null,
            lockedBy: null,
            completedAt: new Date(),
          },
    )
    .where(and(eq(workerJob.id, job.id), eq(workerJob.status, "running"), eq(workerJob.lockedBy, workerId)));
}

async function tick() {
  const job = await claimJob();
  if (!job) {
    return;
  }

  try {
    await processJob(job);
    await settleJob(job);
  } catch (error) {
    await settleJob(job, error);
  }
}

async function run() {
  for (;;) {
    await tick();
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

void run();
