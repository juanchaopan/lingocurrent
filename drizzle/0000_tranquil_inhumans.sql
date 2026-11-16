CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "member_status" CHECK ("members"."status" in ('active', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "article_sentences" (
	"article_id" uuid NOT NULL,
	"sentence_index" integer NOT NULL,
	"paragraph_index" integer NOT NULL,
	"text" text NOT NULL,
	"body_start" integer NOT NULL,
	"body_end" integer NOT NULL,
	"start_ms" integer,
	"end_ms" integer,
	CONSTRAINT "article_sentences_article_id_sentence_index_pk" PRIMARY KEY("article_id","sentence_index"),
	CONSTRAINT "sentence_range" CHECK ("article_sentences"."sentence_index" >= 0 and "article_sentences"."paragraph_index" >= 0 and "article_sentences"."body_start" >= 0 and "article_sentences"."body_end" > "article_sentences"."body_start"),
	CONSTRAINT "sentence_time" CHECK (("article_sentences"."start_ms" is null and "article_sentences"."end_ms" is null) or ("article_sentences"."start_ms" >= 0 and "article_sentences"."end_ms" > "article_sentences"."start_ms"))
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"source_item_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"category_snapshot" text NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"body_hash" text NOT NULL,
	"body_text" text NOT NULL,
	"body_fts" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', body_text)) STORED,
	"state" text NOT NULL,
	"current_asset_id" uuid,
	CONSTRAINT "articles_source_item_id_unique" UNIQUE("source_item_id"),
	CONSTRAINT "article_state" CHECK ("articles"."state" in ('preparing', 'ready')),
	CONSTRAINT "article_ready" CHECK ("articles"."state" <> 'ready' or ("articles"."current_asset_id" is not null and "articles"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "channel_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"local_time" text NOT NULL,
	"target_count" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"next_run_at" timestamp with time zone,
	CONSTRAINT "channel_schedules_channel_id_local_time_unique" UNIQUE("channel_id","local_time"),
	CONSTRAINT "schedule_count" CHECK ("channel_schedules"."target_count" > 0),
	CONSTRAINT "schedule_time" CHECK ("channel_schedules"."local_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"name" text NOT NULL,
	"feed_url" text NOT NULL,
	"category" text NOT NULL,
	"timezone" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "channels_feed_url_unique" UNIQUE("feed_url")
);
--> statement-breakpoint
CREATE TABLE "source_icons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bytes" "bytea" NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"checksum" text NOT NULL,
	CONSTRAINT "source_icons_checksum_unique" UNIQUE("checksum"),
	CONSTRAINT "icon_size" CHECK ("source_icons"."byte_size" between 1 and 65536)
);
--> statement-breakpoint
CREATE TABLE "source_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_key_hash" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_items_source_id_external_key_hash_unique" UNIQUE("source_id","external_key_hash")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"allowed_origin" text NOT NULL,
	"icon_id" uuid,
	"terms_reviewed_at" timestamp with time zone,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sources_name_unique" UNIQUE("name"),
	CONSTRAINT "source_terms" CHECK (not "sources"."enabled" or "sources"."terms_reviewed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "mutation_receipts" (
	"owner_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"request_hash" text NOT NULL,
	"state" text NOT NULL,
	"lease_until" timestamp with time zone,
	"fence" text,
	"result_resource_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mutation_receipts_owner_id_operation_id_pk" PRIMARY KEY("owner_id","operation_id"),
	CONSTRAINT "receipt_state" CHECK ("mutation_receipts"."state" in ('claimed', 'committed', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"owner_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"first_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_owner_id_article_id_pk" PRIMARY KEY("owner_id","article_id")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"object_version" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"duration_ms" integer,
	"first_created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checksum" text NOT NULL,
	"state" text NOT NULL,
	"retire_attempts" integer DEFAULT 0 NOT NULL,
	"retry_at" timestamp with time zone,
	CONSTRAINT "media_assets_object_key_object_version_unique" UNIQUE("object_key","object_version"),
	CONSTRAINT "asset_size" CHECK ("media_assets"."byte_size" > 0),
	CONSTRAINT "asset_duration" CHECK ("media_assets"."duration_ms" is null or "media_assets"."duration_ms" > 0),
	CONSTRAINT "asset_state" CHECK ("media_assets"."state" in ('staging', 'ready', 'retiring'))
);
--> statement-breakpoint
ALTER TABLE "article_sentences" ADD CONSTRAINT "article_sentences_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_item_id_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."source_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_current_asset_id_media_assets_id_fk" FOREIGN KEY ("current_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_schedules" ADD CONSTRAINT "channel_schedules_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_items" ADD CONSTRAINT "source_items_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_icon_id_source_icons_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."source_icons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_receipts" ADD CONSTRAINT "mutation_receipts_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_owner_id_members_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_order" ON "articles" USING btree ("state","collected_at","id");--> statement-breakpoint
CREATE INDEX "article_search" ON "articles" USING gin ("body_fts");--> statement-breakpoint
CREATE INDEX "schedule_due" ON "channel_schedules" USING btree ("enabled","next_run_at");--> statement-breakpoint
CREATE INDEX "receipt_expiry" ON "mutation_receipts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "visit_order" ON "visits" USING btree ("owner_id","last_opened_at","article_id");