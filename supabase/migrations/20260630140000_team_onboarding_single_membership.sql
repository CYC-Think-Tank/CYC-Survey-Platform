-- One-team onboarding and atomic membership lifecycle operations.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.team_members
        GROUP BY user_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one team per user: a user currently has multiple memberships';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.team_join_requests
        WHERE status = 'pending'
        GROUP BY user_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one pending request per user: duplicate pending requests exist';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_one_team_per_user"
    ON public.team_members (user_id);

ALTER TABLE public.team_join_requests
    DROP CONSTRAINT IF EXISTS team_join_requests_team_id_user_id_status_key;

CREATE UNIQUE INDEX IF NOT EXISTS "team_join_requests_one_pending_per_user"
    ON public.team_join_requests (user_id)
    WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.create_team_for_current_user(p_name text)
RETURNS TABLE (id uuid, name text, role public.team_member_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    normalized_name text := trim(p_name);
    created_team public.teams%ROWTYPE;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF normalized_name = '' THEN
        RAISE EXCEPTION 'Team name is required' USING ERRCODE = '22023';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

    IF EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = current_user_id) THEN
        RAISE EXCEPTION 'You already belong to a team' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.teams (name, created_by)
    VALUES (normalized_name, current_user_id)
    RETURNING * INTO created_team;

    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (created_team.id, current_user_id, 'team_leader');

    UPDATE public.team_join_requests
    SET status = 'rejected',
        resolved_at = timezone('utc'::text, now()),
        resolved_by = current_user_id
    WHERE user_id = current_user_id
      AND status = 'pending';

    RETURN QUERY
    SELECT created_team.id, created_team.name::text, 'team_leader'::public.team_member_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_team_join(p_team_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    request_id uuid;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

    IF EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = current_user_id) THEN
        RAISE EXCEPTION 'Leave your current team before requesting another team' USING ERRCODE = '23505';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = p_team_id) THEN
        RAISE EXCEPTION 'Team not found' USING ERRCODE = '22023';
    END IF;

    SELECT tjr.id
    INTO request_id
    FROM public.team_join_requests tjr
    WHERE tjr.user_id = current_user_id
      AND tjr.status = 'pending'
    LIMIT 1;

    IF request_id IS NOT NULL THEN
        RAISE EXCEPTION 'You already have a pending team request' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.team_join_requests (team_id, user_id, status)
    VALUES (p_team_id, current_user_id, 'pending')
    RETURNING id INTO request_id;

    RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_team_join_request(
    p_request_id uuid,
    p_approve boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    join_request public.team_join_requests%ROWTYPE;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO join_request
    FROM public.team_join_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF join_request.id IS NULL THEN
        RAISE EXCEPTION 'Join request not found' USING ERRCODE = '22023';
    END IF;
    IF join_request.status <> 'pending' THEN
        RAISE EXCEPTION 'Join request is no longer pending' USING ERRCODE = '22023';
    END IF;
    IF NOT public.is_team_leader(join_request.team_id, current_user_id) THEN
        RAISE EXCEPTION 'Team leader permission required' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(join_request.user_id::text, 0));

    IF p_approve THEN
        IF EXISTS (
            SELECT 1 FROM public.team_members tm WHERE tm.user_id = join_request.user_id
        ) THEN
            RAISE EXCEPTION 'Requesting user already belongs to a team' USING ERRCODE = '23505';
        END IF;

        INSERT INTO public.team_members (team_id, user_id, role)
        VALUES (join_request.team_id, join_request.user_id, 'team_member');
    END IF;

    UPDATE public.team_join_requests
    SET status = CASE
            WHEN p_approve THEN 'approved'::public.team_join_request_status
            ELSE 'rejected'::public.team_join_request_status
        END,
        resolved_at = timezone('utc'::text, now()),
        resolved_by = current_user_id
    WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_current_team()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
    membership public.team_members%ROWTYPE;
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO membership
    FROM public.team_members
    WHERE user_id = current_user_id
    FOR UPDATE;

    IF membership.id IS NULL THEN
        RAISE EXCEPTION 'You do not belong to a team' USING ERRCODE = '22023';
    END IF;
    IF membership.role = 'team_leader' THEN
        RAISE EXCEPTION 'Transfer leadership before leaving the team' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.team_members WHERE id = membership.id;
    RETURN membership.team_id;
END;
$$;

DROP POLICY IF EXISTS "Team leaders can manage memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team leaders can manage join requests" ON public.team_join_requests;
DROP POLICY IF EXISTS "Users can create own join requests" ON public.team_join_requests;

CREATE POLICY "Users can create own join requests"
    ON public.team_join_requests FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND status = 'pending'
        AND NOT EXISTS (
            SELECT 1
            FROM public.team_members tm
            WHERE tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team leaders can read team join requests"
    ON public.team_join_requests FOR SELECT TO authenticated
    USING (public.is_team_leader(team_id));

REVOKE ALL ON FUNCTION public.create_team_for_current_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_team_join(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_team_join_request(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_current_team() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_team_for_current_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_team_join(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_team_join_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_current_team() TO authenticated;
