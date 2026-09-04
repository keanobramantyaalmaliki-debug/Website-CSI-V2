CREATE TYPE "public"."process_glyph" AS ENUM('discovery', 'strategy', 'design', 'development', 'testing', 'deployment');--> statement-breakpoint
CREATE TYPE "public"."process_step_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "process_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kicker" text DEFAULT '' NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"glyph" "process_glyph" DEFAULT 'discovery' NOT NULL,
	"state" "process_step_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "process_steps_title_alive" ON "process_steps" USING btree ("title") WHERE "process_steps"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "process_steps_order" ON "process_steps" USING btree ("sort_order");