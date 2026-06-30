-- Team-scoped admin auth and authorization.
-- Surveys are owned by teams; owner_user_id is creator/audit metadata.

CREATE TYPE "public"."team_member_role" AS ENUM ('team_leader', 'team_member');
CREATE TYPE "public"."team_join_request_status" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL,
    "email" text NOT NULL,
    "full_name" text,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"())
);

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_key"
    ON "public"."profiles" USING btree ("email");

CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" uuid DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" text NOT NULL,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"())
);

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" uuid DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" "public"."team_member_role" DEFAULT 'team_member'::"public"."team_member_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"())
);

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS "public"."team_join_requests" (
    "id" uuid DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "status" "public"."team_join_request_status" DEFAULT 'pending'::"public"."team_join_request_status" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()),
    "resolved_at" timestamp with time zone,
    "resolved_by" uuid
);

ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_team_id_user_id_status_key" UNIQUE ("team_id", "user_id", "status");

ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_join_requests"
    ADD CONSTRAINT "team_join_requests_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE "public"."surveys"
    ADD COLUMN IF NOT EXISTS "owner_user_id" uuid,
    ADD COLUMN IF NOT EXISTS "team_id" uuid;

ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_surveys_owner_user_id"
    ON "public"."surveys" USING btree ("owner_user_id");

CREATE INDEX IF NOT EXISTS "idx_surveys_team_id"
    ON "public"."surveys" USING btree ("team_id");

CREATE INDEX IF NOT EXISTS "idx_team_members_user_id"
    ON "public"."team_members" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "idx_team_members_team_id"
    ON "public"."team_members" USING btree ("team_id");

CREATE INDEX IF NOT EXISTS "idx_team_join_requests_user_id"
    ON "public"."team_join_requests" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "idx_team_join_requests_team_id"
    ON "public"."team_join_requests" USING btree ("team_id");

CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
    )
    ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."is_team_member"("check_team_id" uuid, "check_user_id" uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = check_team_id
          AND tm.user_id = check_user_id
    );
$$;

CREATE OR REPLACE FUNCTION "public"."is_team_leader"("check_team_id" uuid, "check_user_id" uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = check_team_id
          AND tm.user_id = check_user_id
          AND tm.role = 'team_leader'
    );
$$;

DROP TRIGGER IF EXISTS "on_auth_user_created_create_profile" ON "auth"."users";
CREATE TRIGGER "on_auth_user_created_create_profile"
    AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user_profile"();

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_join_requests" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of active surveys" ON "public"."surveys";
CREATE POLICY "Allow anon read of active surveys"
    ON "public"."surveys" FOR SELECT TO "anon"
    USING ("is_active" = true);

DROP POLICY IF EXISTS "Allow public read of questions" ON "public"."questions";
CREATE POLICY "Allow anon read of active survey questions"
    ON "public"."questions" FOR SELECT TO "anon"
    USING (
        EXISTS (
            SELECT 1 FROM "public"."surveys" s
            WHERE s."id" = "questions"."survey_id"
              AND s."is_active" = true
        )
    );

CREATE POLICY "Profiles can read own profile"
    ON "public"."profiles" FOR SELECT TO "authenticated"
    USING ("id" = auth.uid());

CREATE POLICY "Profiles can update own profile"
    ON "public"."profiles" FOR UPDATE TO "authenticated"
    USING ("id" = auth.uid())
    WITH CHECK ("id" = auth.uid());

CREATE POLICY "Profiles can insert own profile"
    ON "public"."profiles" FOR INSERT TO "authenticated"
    WITH CHECK ("id" = auth.uid());

CREATE POLICY "Team members can read own memberships"
    ON "public"."team_members" FOR SELECT TO "authenticated"
    USING ("user_id" = auth.uid());

CREATE POLICY "Team leaders can manage memberships"
    ON "public"."team_members" FOR ALL TO "authenticated"
    USING ("public"."is_team_leader"("team_id"))
    WITH CHECK ("public"."is_team_leader"("team_id"));

CREATE POLICY "Users can read their teams"
    ON "public"."teams" FOR SELECT TO "authenticated"
    USING ("public"."is_team_member"("id"));

CREATE POLICY "Authenticated users can list teams for join requests"
    ON "public"."teams" FOR SELECT TO "authenticated"
    USING (true);

CREATE POLICY "Users can create own join requests"
    ON "public"."team_join_requests" FOR INSERT TO "authenticated"
    WITH CHECK ("user_id" = auth.uid() AND "status" = 'pending');

CREATE POLICY "Users can read own join requests"
    ON "public"."team_join_requests" FOR SELECT TO "authenticated"
    USING ("user_id" = auth.uid());

CREATE POLICY "Team leaders can manage join requests"
    ON "public"."team_join_requests" FOR ALL TO "authenticated"
    USING ("public"."is_team_leader"("team_id"))
    WITH CHECK ("public"."is_team_leader"("team_id"));

CREATE POLICY "Team members can read team surveys"
    ON "public"."surveys" FOR SELECT TO "authenticated"
    USING ("public"."is_team_member"("team_id"));

CREATE POLICY "Team members can create team surveys"
    ON "public"."surveys" FOR INSERT TO "authenticated"
    WITH CHECK (
        "owner_user_id" = auth.uid()
        AND "public"."is_team_member"("team_id")
    );

CREATE POLICY "Team members can update team surveys"
    ON "public"."surveys" FOR UPDATE TO "authenticated"
    USING ("public"."is_team_member"("team_id"))
    WITH CHECK ("public"."is_team_member"("team_id"));

CREATE POLICY "Team leaders can delete team surveys"
    ON "public"."surveys" FOR DELETE TO "authenticated"
    USING ("public"."is_team_leader"("team_id"));

CREATE POLICY "Team members can read team survey questions"
    ON "public"."questions" FOR SELECT TO "authenticated"
    USING (
        EXISTS (
            SELECT 1
            FROM "public"."surveys" s
            WHERE s."id" = "questions"."survey_id"
              AND "public"."is_team_member"(s."team_id")
        )
    );

CREATE POLICY "Team members can write team survey questions"
    ON "public"."questions" FOR ALL TO "authenticated"
    USING (
        EXISTS (
            SELECT 1
            FROM "public"."surveys" s
            WHERE s."id" = "questions"."survey_id"
              AND "public"."is_team_member"(s."team_id")
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM "public"."surveys" s
            WHERE s."id" = "questions"."survey_id"
              AND "public"."is_team_member"(s."team_id")
        )
    );

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";

GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";

GRANT ALL ON TABLE "public"."team_join_requests" TO "anon";
GRANT ALL ON TABLE "public"."team_join_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."team_join_requests" TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_team_member"(uuid, uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."is_team_member"(uuid, uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."is_team_leader"(uuid, uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."is_team_leader"(uuid, uuid) TO "service_role";
