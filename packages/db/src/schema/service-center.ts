import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
};

export const serviceApp = pgTable(
  "service_app",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("service_app_active_idx").on(table.isActive)],
);

export const appMembership = pgTable(
  "app_membership",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => serviceApp.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("app_membership_app_user_unique").on(table.appId, table.userId),
    index("app_membership_user_idx").on(table.userId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_actor_idx").on(table.actorUserId),
    index("audit_log_target_idx").on(table.targetType, table.targetId),
  ],
);

export const importRun = pgTable(
  "import_run",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    status: text("status").notNull().default("queued"),
    totalRecords: integer("total_records").notNull().default(0),
    processedRecords: integer("processed_records").notNull().default(0),
    rejectedRecords: integer("rejected_records").notNull().default(0),
    checkpoint: jsonb("checkpoint").$type<Record<string, unknown>>(),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...timestamps,
  },
  (table) => [index("import_run_status_idx").on(table.status)],
);

export const importRecord = pgTable(
  "import_record",
  {
    id: text("id").primaryKey(),
    importRunId: text("import_run_id")
      .notNull()
      .references(() => importRun.id, { onDelete: "cascade" }),
    sourceCollection: text("source_collection").notNull(),
    sourceId: text("source_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    validationError: text("validation_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("import_record_source_unique").on(table.importRunId, table.sourceCollection, table.sourceId),
    index("import_record_run_idx").on(table.importRunId),
  ],
);

export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull().unique(),
    name: text("name"),
    industry: text("industry"),
    country: text("country"),
    employeeRange: text("employee_range"),
    enrichment: jsonb("enrichment").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [index("company_industry_idx").on(table.industry)],
);

export const statusEndpoint = pgTable(
  "status_endpoint",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    sourceQuery: text("source_query"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("status_endpoint_canonical_url_unique").on(table.canonicalUrl),
    index("status_endpoint_company_idx").on(table.companyId),
  ],
);

export const providerScoreEvent = pgTable(
  "provider_score_event",
  {
    id: text("id").primaryKey(),
    statusEndpointId: text("status_endpoint_id")
      .notNull()
      .references(() => statusEndpoint.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    rawScore: text("raw_score"),
    scoreStatus: text("score_status").notNull(),
    evaluatedAt: timestamp("evaluated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("provider_score_endpoint_idx").on(table.statusEndpointId),
    index("provider_score_provider_idx").on(table.provider),
  ],
);

export const contact = pgTable(
  "contact",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    title: text("title"),
    department: text("department"),
    seniority: text("seniority"),
    linkedinUrl: text("linkedin_url"),
    phone: text("phone"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    acceptAll: boolean("accept_all").default(false).notNull(),
    lastVerifiedAt: timestamp("last_verified_at"),
    ...timestamps,
  },
  (table) => [
    index("contact_company_idx").on(table.companyId),
    index("contact_eligibility_idx").on(table.verificationStatus, table.acceptAll),
  ],
);

export const contactSource = pgTable(
  "contact_source",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url"),
    legalBasis: text("legal_basis"),
    observedAt: timestamp("observed_at"),
    rawMetadata: jsonb("raw_metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("contact_source_contact_idx").on(table.contactId)],
);

export const suppression = pgTable(
  "suppression",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    reason: text("reason").notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("suppression_reason_idx").on(table.reason)],
);

export const leadEligibility = pgTable(
  "lead_eligibility",
  {
    id: text("id").primaryKey(),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("review_required"),
    reason: text("reason"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("lead_eligibility_contact_unique").on(table.contactId),
    index("lead_eligibility_status_idx").on(table.status),
  ],
);

export const leadScore = pgTable(
  "lead_score",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    modelVersion: text("model_version").notNull(),
    score: integer("score").notNull(),
    rationale: jsonb("rationale").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("lead_score_company_idx").on(table.companyId)],
);

export const mailingProject = pgTable(
  "mailing_project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("draft"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [index("mailing_project_status_idx").on(table.status)],
);

export const mailingTemplate = pgTable(
  "mailing_template",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mailingProject.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    variables: jsonb("variables").$type<string[]>().notNull().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [index("mailing_template_project_idx").on(table.projectId)],
);

export const senderAccount = pgTable(
  "sender_account",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    fromEmail: text("from_email").notNull().unique(),
    fromName: text("from_name").notNull(),
    smtpConfig: text("smtp_config").notNull(),
    imapConfig: text("imap_config").notNull(),
    encryptionKeyId: text("encryption_key_id").notNull(),
    hourlyLimit: integer("hourly_limit").notNull().default(20),
    dailyLimit: integer("daily_limit").notNull().default(100),
    timezone: text("timezone").notNull().default("Europe/Berlin"),
    sendingWindow: jsonb("sending_window").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("pending"),
    ...timestamps,
  },
  (table) => [index("sender_account_status_idx").on(table.status)],
);

export const campaign = pgTable(
  "campaign",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => mailingProject.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .notNull()
      .references(() => mailingTemplate.id, { onDelete: "restrict" }),
    senderAccountId: text("sender_account_id")
      .notNull()
      .references(() => senderAccount.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    status: text("status").notNull().default("draft"),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
    scheduledAt: timestamp("scheduled_at"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("campaign_project_idx").on(table.projectId),
    index("campaign_status_schedule_idx").on(table.status, table.scheduledAt),
  ],
);

export const campaignRecipient = pgTable(
  "campaign_recipient",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaign.id, { onDelete: "cascade" }),
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    renderedSubject: text("rendered_subject"),
    renderedBody: text("rendered_body"),
    messageId: text("message_id").unique(),
    sentAt: timestamp("sent_at"),
    repliedAt: timestamp("replied_at"),
    bouncedAt: timestamp("bounced_at"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("campaign_recipient_unique").on(table.campaignId, table.contactId),
    index("campaign_recipient_status_idx").on(table.status),
  ],
);

export const workerJob = pgTable(
  "worker_job",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    status: text("status").notNull().default("queued"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    runAt: timestamp("run_at").defaultNow().notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lockedAt: timestamp("locked_at"),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at"),
    ...timestamps,
  },
  (table) => [index("worker_job_claim_idx").on(table.status, table.runAt)],
);

export const serviceAppRelations = relations(serviceApp, ({ many }) => ({
  memberships: many(appMembership),
}));

export const appMembershipRelations = relations(appMembership, ({ one }) => ({
  app: one(serviceApp, { fields: [appMembership.appId], references: [serviceApp.id] }),
  member: one(user, { fields: [appMembership.userId], references: [user.id] }),
}));
