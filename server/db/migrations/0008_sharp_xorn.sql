CREATE TYPE "public"."industry_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TYPE "public"."industry_tier" AS ENUM('core', 'also');--> statement-breakpoint
CREATE TABLE "industries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"tier" "industry_tier" DEFAULT 'also' NOT NULL,
	"photo_id" uuid,
	"state" "industry_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "industries_name_alive" ON "industries" USING btree ("name") WHERE "industries"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "industries_order" ON "industries" USING btree ("sort_order");