CREATE TYPE "public"."work_project_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "work_project_tags" (
	"project_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "work_project_tags_project_id_position_pk" PRIMARY KEY("project_id","position")
);
--> statement-breakpoint
CREATE TABLE "work_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"client" text DEFAULT '' NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"outcome" text DEFAULT '' NOT NULL,
	"state" "work_project_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "work_project_tags" ADD CONSTRAINT "work_project_tags_project_id_work_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."work_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_projects" ADD CONSTRAINT "work_projects_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_projects_title_alive" ON "work_projects" USING btree ("title") WHERE "work_projects"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "work_projects_order" ON "work_projects" USING btree ("sort_order");