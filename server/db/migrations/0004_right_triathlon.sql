CREATE TYPE "public"."case_study_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "case_studies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"client" text DEFAULT '' NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"industry" text DEFAULT '' NOT NULL,
	"outcome" text DEFAULT '' NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"state" "case_study_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "case_study_scopes" (
	"study_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "case_study_scopes_study_id_position_pk" PRIMARY KEY("study_id","position")
);
--> statement-breakpoint
ALTER TABLE "case_studies" ADD CONSTRAINT "case_studies_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_study_scopes" ADD CONSTRAINT "case_study_scopes_study_id_case_studies_id_fk" FOREIGN KEY ("study_id") REFERENCES "public"."case_studies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_studies_title_alive" ON "case_studies" USING btree ("title") WHERE "case_studies"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "case_studies_order" ON "case_studies" USING btree ("sort_order");