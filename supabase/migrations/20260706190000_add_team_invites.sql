-- Leader-initiated team invites: a team leader invites a person by email;
-- that person sees it as a pending invite (matched against their verified
-- auth email) on their teams hub and can accept or decline it.

CREATE TYPE "public"."team_invite_status" AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE IF NOT EXISTS "public"."team_invites" (
    "id" uuid DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "team_id" uuid NOT NULL,
    "invited_email" text NOT NULL,
    "invited_by" uuid,
    "status" "public"."team_invite_status" DEFAULT 'pending'::"public"."team_invite_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::text, "now"()),
    "resolved_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_invites"
    ADD CONSTRAINT "team_invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_one_pending_per_team_email"
    ON "public"."team_invites" ("team_id", "invited_email")
    WHERE ("status" = 'pending');

CREATE INDEX IF NOT EXISTS "idx_team_invites_team_id"
    ON "public"."team_invites" USING btree ("team_id");

CREATE INDEX IF NOT EXISTS "idx_team_invites_invited_email"
    ON "public"."team_invites" USING btree ("invited_email");

CREATE OR REPLACE FUNCTION "public"."invite_user_to_team"("p_email" text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    leader_team_id uuid;
    normalized_email text := lower(trim(p_email));
    new_invite_id uuid;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF normalized_email = '' OR normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
        RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
    END IF;

    SELECT tm.team_id INTO leader_team_id
    FROM public.team_members tm
    WHERE tm.user_id = current_user_id AND tm.role = 'team_leader'
    LIMIT 1;

    IF leader_team_id IS NULL THEN
        RAISE EXCEPTION 'Team leader permission required' USING ERRCODE = '42501';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.team_members tm2
        JOIN public.profiles p ON p.id = tm2.user_id
        WHERE tm2.team_id = leader_team_id AND lower(p.email) = normalized_email
    ) THEN
        RAISE EXCEPTION 'That person is already on your team' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.team_invites (team_id, invited_email, invited_by, status)
    VALUES (leader_team_id, normalized_email, current_user_id, 'pending')
    ON CONFLICT (team_id, invited_email) WHERE status = 'pending' DO NOTHING
    RETURNING id INTO new_invite_id;

    IF new_invite_id IS NULL THEN
        RAISE EXCEPTION 'An invite is already pending for that email' USING ERRCODE = '23505';
    END IF;

    RETURN new_invite_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."accept_team_invite"("p_invite_id" uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
    invite public.team_invites%ROWTYPE;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO invite FROM public.team_invites WHERE id = p_invite_id FOR UPDATE;

    IF invite.id IS NULL THEN
        RAISE EXCEPTION 'Invite not found' USING ERRCODE = '22023';
    END IF;
    IF invite.status <> 'pending' THEN
        RAISE EXCEPTION 'Invite is no longer pending' USING ERRCODE = '22023';
    END IF;
    IF lower(invite.invited_email) <> current_email THEN
        RAISE EXCEPTION 'This invite is not addressed to you' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

    IF EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = current_user_id) THEN
        RAISE EXCEPTION 'Leave your current team before accepting another invite' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (invite.team_id, current_user_id, 'team_member');

    UPDATE public.team_invites
    SET status = 'accepted', resolved_at = timezone('utc'::text, now())
    WHERE id = invite.id;

    -- Any other pending invites addressed to this email are now moot.
    UPDATE public.team_invites
    SET status = 'declined', resolved_at = timezone('utc'::text, now())
    WHERE lower(invited_email) = current_email AND status = 'pending' AND id <> invite.id;

    -- Mirrors create_team_for_current_user's cleanup of a stale join request.
    UPDATE public.team_join_requests
    SET status = 'rejected', resolved_at = timezone('utc'::text, now()), resolved_by = current_user_id
    WHERE user_id = current_user_id AND status = 'pending';

    RETURN invite.team_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."decline_team_invite"("p_invite_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
    invite public.team_invites%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO invite FROM public.team_invites WHERE id = p_invite_id FOR UPDATE;

    IF invite.id IS NULL THEN
        RAISE EXCEPTION 'Invite not found' USING ERRCODE = '22023';
    END IF;
    IF invite.status <> 'pending' THEN
        RAISE EXCEPTION 'Invite is no longer pending' USING ERRCODE = '22023';
    END IF;
    IF lower(invite.invited_email) <> current_email THEN
        RAISE EXCEPTION 'This invite is not addressed to you' USING ERRCODE = '42501';
    END IF;

    UPDATE public.team_invites
    SET status = 'declined', resolved_at = timezone('utc'::text, now())
    WHERE id = invite.id;
END;
$$;

ALTER TABLE "public"."team_invites" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitees can read their own invites"
    ON "public"."team_invites" FOR SELECT TO "authenticated"
    USING (lower("invited_email") = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Team leaders can manage their team invites"
    ON "public"."team_invites" FOR ALL TO "authenticated"
    USING ("public"."is_team_leader"("team_id"))
    WITH CHECK ("public"."is_team_leader"("team_id"));

GRANT ALL ON TABLE "public"."team_invites" TO "anon";
GRANT ALL ON TABLE "public"."team_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."team_invites" TO "service_role";

REVOKE ALL ON FUNCTION "public"."invite_user_to_team"(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."accept_team_invite"(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."decline_team_invite"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."invite_user_to_team"(text) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."accept_team_invite"(uuid) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."decline_team_invite"(uuid) TO "authenticated";
