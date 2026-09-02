CREATE TYPE "public"."service_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TABLE "service_subs" (
	"service_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "service_subs_service_id_position_pk" PRIMARY KEY("service_id","position")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"state" "service_state" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "service_subs" ADD CONSTRAINT "service_subs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "services_title_alive" ON "services" USING btree ("title") WHERE "services"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "services_order" ON "services" USING btree ("sort_order");