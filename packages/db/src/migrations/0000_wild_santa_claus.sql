CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"template_id" text NOT NULL,
	"sender_account_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_at" timestamp,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipient" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rendered_subject" text,
	"rendered_body" text,
	"message_id" text,
	"sent_at" timestamp,
	"replied_at" timestamp,
	"bounced_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_recipient_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" text PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"name" text,
	"industry" text,
	"country" text,
	"employee_range" text,
	"enrichment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"title" text,
	"department" text,
	"seniority" text,
	"linkedin_url" text,
	"phone" text,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"accept_all" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "contact_source" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"legal_basis" text,
	"observed_at" timestamp,
	"raw_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_record" (
	"id" text PRIMARY KEY NOT NULL,
	"import_run_id" text NOT NULL,
	"source_collection" text NOT NULL,
	"source_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"validation_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_run" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"processed_records" integer DEFAULT 0 NOT NULL,
	"rejected_records" integer DEFAULT 0 NOT NULL,
	"checkpoint" jsonb,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_eligibility" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"status" text DEFAULT 'review_required' NOT NULL,
	"reason" text,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_score" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"model_version" text NOT NULL,
	"score" integer NOT NULL,
	"rationale" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_template" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_score_event" (
	"id" text PRIMARY KEY NOT NULL,
	"status_endpoint_id" text NOT NULL,
	"provider" text NOT NULL,
	"raw_score" text,
	"score_status" text NOT NULL,
	"evaluated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sender_account" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text NOT NULL,
	"smtp_config" text NOT NULL,
	"imap_config" text NOT NULL,
	"encryption_key_id" text NOT NULL,
	"hourly_limit" integer DEFAULT 20 NOT NULL,
	"daily_limit" integer DEFAULT 100 NOT NULL,
	"timezone" text DEFAULT 'Europe/Berlin' NOT NULL,
	"sending_window" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sender_account_from_email_unique" UNIQUE("from_email")
);
--> statement-breakpoint
CREATE TABLE "service_app" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_app_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "status_endpoint" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"url" text NOT NULL,
	"canonical_url" text NOT NULL,
	"source_query" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppression" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "suppression_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "worker_job" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"locked_at" timestamp,
	"locked_by" text,
	"last_error" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_membership" ADD CONSTRAINT "app_membership_app_id_service_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."service_app"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_membership" ADD CONSTRAINT "app_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_project_id_mailing_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mailing_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_template_id_mailing_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."mailing_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_sender_account_id_sender_account_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."sender_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_campaign_id_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaign"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipient" ADD CONSTRAINT "campaign_recipient_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact" ADD CONSTRAINT "contact_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_source" ADD CONSTRAINT "contact_source_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_record" ADD CONSTRAINT "import_record_import_run_id_import_run_id_fk" FOREIGN KEY ("import_run_id") REFERENCES "public"."import_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_eligibility" ADD CONSTRAINT "lead_eligibility_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_eligibility" ADD CONSTRAINT "lead_eligibility_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_score" ADD CONSTRAINT "lead_score_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_project" ADD CONSTRAINT "mailing_project_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailing_template" ADD CONSTRAINT "mailing_template_project_id_mailing_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."mailing_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_score_event" ADD CONSTRAINT "provider_score_event_status_endpoint_id_status_endpoint_id_fk" FOREIGN KEY ("status_endpoint_id") REFERENCES "public"."status_endpoint"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_endpoint" ADD CONSTRAINT "status_endpoint_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "app_membership_app_user_unique" ON "app_membership" USING btree ("app_id","user_id");--> statement-breakpoint
CREATE INDEX "app_membership_user_idx" ON "app_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "campaign_project_idx" ON "campaign" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "campaign_status_schedule_idx" ON "campaign" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipient_unique" ON "campaign_recipient" USING btree ("campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "campaign_recipient_status_idx" ON "campaign_recipient" USING btree ("status");--> statement-breakpoint
CREATE INDEX "company_industry_idx" ON "company" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "contact_company_idx" ON "contact" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "contact_eligibility_idx" ON "contact" USING btree ("verification_status","accept_all");--> statement-breakpoint
CREATE INDEX "contact_source_contact_idx" ON "contact_source" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_record_source_unique" ON "import_record" USING btree ("import_run_id","source_collection","source_id");--> statement-breakpoint
CREATE INDEX "import_record_run_idx" ON "import_record" USING btree ("import_run_id");--> statement-breakpoint
CREATE INDEX "import_run_status_idx" ON "import_run" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_eligibility_contact_unique" ON "lead_eligibility" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "lead_eligibility_status_idx" ON "lead_eligibility" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_score_company_idx" ON "lead_score" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "mailing_project_status_idx" ON "mailing_project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mailing_template_project_idx" ON "mailing_template" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "provider_score_endpoint_idx" ON "provider_score_event" USING btree ("status_endpoint_id");--> statement-breakpoint
CREATE INDEX "provider_score_provider_idx" ON "provider_score_event" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "sender_account_status_idx" ON "sender_account" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_app_active_idx" ON "service_app" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "status_endpoint_canonical_url_unique" ON "status_endpoint" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "status_endpoint_company_idx" ON "status_endpoint" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "suppression_reason_idx" ON "suppression" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "worker_job_claim_idx" ON "worker_job" USING btree ("status","run_at");