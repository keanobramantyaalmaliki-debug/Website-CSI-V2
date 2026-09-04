CREATE TYPE "public"."section_key" AS ENUM('csi-hero', 'deployments', 'process', 'industries', 'services-lead', 'work-lead', 'selected-work', 'case-studies', 'people-intro', 'the-crew', 'careers');--> statement-breakpoint
CREATE TABLE "section_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "section_key" NOT NULL,
	"heading" text DEFAULT '' NOT NULL,
	"subheading" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "section_texts_key_unique" UNIQUE("key")
);
