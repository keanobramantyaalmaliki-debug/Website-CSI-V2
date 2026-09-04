CREATE TYPE "public"."value_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "people_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"state" "value_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "people_values" ADD CONSTRAINT "people_values_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "people_values_title_alive" ON "people_values" USING btree ("title") WHERE "people_values"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "people_values_order" ON "people_values" USING btree ("sort_order");