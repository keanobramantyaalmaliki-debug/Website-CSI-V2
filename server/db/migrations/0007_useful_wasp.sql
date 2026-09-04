CREATE TABLE "vision" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"statement" text DEFAULT '' NOT NULL,
	"photo_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "vision_satu_baris" CHECK ("vision"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "vision" ADD CONSTRAINT "vision_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;