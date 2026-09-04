CREATE TYPE "public"."crew_category" AS ENUM('Management', 'Developer', 'R & D');--> statement-breakpoint
CREATE TYPE "public"."crew_state" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TYPE "public"."social_platform" AS ENUM('linkedin', 'github', 'x');--> statement-breakpoint
CREATE TABLE "crew_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"category" "crew_category" NOT NULL,
	"photo_id" uuid,
	"state" "crew_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "crew_socials" (
	"member_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"platform" "social_platform" NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "crew_socials_member_id_position_pk" PRIMARY KEY("member_id","position")
);
--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_socials" ADD CONSTRAINT "crew_socials_member_id_crew_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."crew_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crew_members_name_alive" ON "crew_members" USING btree ("name") WHERE "crew_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "crew_members_category" ON "crew_members" USING btree ("category");