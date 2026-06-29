-- App schema extensions added after the initial remote schema dump.
-- These are idempotent so local resets and future applies can run safely.

ALTER TABLE "public"."surveys"
    ADD COLUMN IF NOT EXISTS "enabled_languages" jsonb;


CREATE TABLE IF NOT EXISTS "public"."translations" (
    "id" uuid DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "survey_id" uuid,
    "language_code" character varying(10) NOT NULL,
    "title" text,
    "description" text,
    "questions" jsonb,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_survey_id_language_code_key" UNIQUE ("survey_id", "language_code");

ALTER TABLE ONLY "public"."translations"
    ADD CONSTRAINT "translations_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_translations_survey_lang"
    ON "public"."translations" USING btree ("survey_id", "language_code");

ALTER TABLE "public"."translations" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of translations" ON "public"."translations";
CREATE POLICY "Allow public read of translations"
    ON "public"."translations" FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow service writes to translations" ON "public"."translations";
CREATE POLICY "Allow service writes to translations"
    ON "public"."translations" FOR ALL
    USING (true)
    WITH CHECK (true);


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" uuid DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" text,
    "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "content" text NOT NULL,
    "author" character varying(255),
    "thumbnail_url" text,
    "is_published" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"())
);

ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of published blog posts" ON "public"."blog_posts";
CREATE POLICY "Allow public read of published blog posts"
    ON "public"."blog_posts" FOR SELECT
    USING ("is_published" = true);

DROP POLICY IF EXISTS "Allow admin full access to blog posts" ON "public"."blog_posts";
CREATE POLICY "Allow admin full access to blog posts"
    ON "public"."blog_posts" FOR ALL
    USING (true)
    WITH CHECK (true);


CREATE TABLE IF NOT EXISTS "public"."event_raffle_entries" (
    "id" uuid DEFAULT "gen_random_uuid"() NOT NULL,
    "event_code" text NOT NULL,
    "email" text NOT NULL,
    "survey_id" uuid,
    "session_id" uuid,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "event_raffle_entries_event_code_email_survey_id_key" UNIQUE ("event_code", "email", "survey_id")
);

ALTER TABLE ONLY "public"."event_raffle_entries"
    ADD CONSTRAINT "event_raffle_entries_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."event_raffle_entries"
    ADD CONSTRAINT "event_raffle_entries_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."event_raffle_entries"
    ADD CONSTRAINT "event_raffle_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."response_sessions"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_event_raffle_event_code"
    ON "public"."event_raffle_entries" USING btree ("event_code");

ALTER TABLE "public"."event_raffle_entries" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow event raffle insert" ON "public"."event_raffle_entries";
CREATE POLICY "Allow event raffle insert"
    ON "public"."event_raffle_entries" FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow event raffle read" ON "public"."event_raffle_entries";
CREATE POLICY "Allow event raffle read"
    ON "public"."event_raffle_entries" FOR SELECT
    USING (true);


GRANT ALL ON TABLE "public"."translations" TO "anon";
GRANT ALL ON TABLE "public"."translations" TO "authenticated";
GRANT ALL ON TABLE "public"."translations" TO "service_role";

GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";

GRANT ALL ON TABLE "public"."event_raffle_entries" TO "anon";
GRANT ALL ON TABLE "public"."event_raffle_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."event_raffle_entries" TO "service_role";
