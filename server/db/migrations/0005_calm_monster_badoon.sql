CREATE TYPE "public"."testimonial_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"state" "testimonial_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "testimonials_name_alive" ON "testimonials" USING btree ("name") WHERE "testimonials"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "testimonials_order" ON "testimonials" USING btree ("sort_order");