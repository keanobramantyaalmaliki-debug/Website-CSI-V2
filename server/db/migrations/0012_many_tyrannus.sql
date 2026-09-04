CREATE TABLE "footer" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"copyright" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "footer_satu_baris" CHECK ("footer"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "footer_socials" (
	"footer_id" integer NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	CONSTRAINT "footer_socials_footer_id_position_pk" PRIMARY KEY("footer_id","position")
);
--> statement-breakpoint
ALTER TABLE "footer_socials" ADD CONSTRAINT "footer_socials_footer_id_footer_id_fk" FOREIGN KEY ("footer_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;