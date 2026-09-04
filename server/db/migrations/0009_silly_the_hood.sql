CREATE TYPE "public"."deployment_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sector" text NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"state" "deployment_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deployments_sector_region_alive" ON "deployments" USING btree ("sector","region") WHERE "deployments"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "deployments_order" ON "deployments" USING btree ("sort_order");