CREATE TYPE "public"."bullet_kind" AS ENUM('responsibility', 'qualification');--> statement-breakpoint
CREATE TYPE "public"."image_source" AS ENUM('static', 'upload');--> statement-breakpoint
CREATE TYPE "public"."job_state" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."lang" AS ENUM('en', 'id');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_name" text,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"snapshot" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"source" "image_source" DEFAULT 'upload' NOT NULL,
	"original_name" text,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "job_copy" (
	"job_id" uuid NOT NULL,
	"lang" "lang" NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	CONSTRAINT "job_copy_job_id_lang_pk" PRIMARY KEY("job_id","lang")
);
--> statement-breakpoint
CREATE TABLE "job_copy_bullets" (
	"job_id" uuid NOT NULL,
	"lang" "lang" NOT NULL,
	"kind" "bullet_kind" NOT NULL,
	"position" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "job_copy_bullets_job_id_lang_kind_position_pk" PRIMARY KEY("job_id","lang","kind","position")
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "job_skills_job_id_position_pk" PRIMARY KEY("job_id","position")
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"state" "job_state" DEFAULT 'draft' NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"ask_github" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_copy" ADD CONSTRAINT "job_copy_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_copy_bullets" ADD CONSTRAINT "job_copy_bullets_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit_log" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_slug_alive" ON "jobs" USING btree ("slug") WHERE "jobs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "jobs_state" ON "jobs" USING btree ("state");--> statement-breakpoint
CREATE INDEX "sessions_user" ON "sessions" USING btree ("user_id");