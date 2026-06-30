-- Enforce one leader per team and provide an atomic leadership-transfer operation.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE role = 'team_leader'
        GROUP BY team_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one team leader: a team currently has multiple leaders';
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "team_members_one_leader_per_team"
    ON public.team_members (team_id)
    WHERE role = 'team_leader';

CREATE OR REPLACE FUNCTION public.transfer_team_leadership(
    p_team_id uuid,
    p_new_leader_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid := auth.uid();
BEGIN
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    PERFORM 1
    FROM public.team_members
    WHERE team_id = p_team_id
    FOR UPDATE;

    IF NOT EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE team_id = p_team_id
          AND user_id = current_user_id
          AND role = 'team_leader'
    ) THEN
        RAISE EXCEPTION 'Team leader permission required' USING ERRCODE = '42501';
    END IF;

    IF p_new_leader_user_id = current_user_id THEN
        RAISE EXCEPTION 'Select another team member' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE team_id = p_team_id
          AND user_id = p_new_leader_user_id
    ) THEN
        RAISE EXCEPTION 'New leader must already be a team member' USING ERRCODE = '22023';
    END IF;

    UPDATE public.team_members
    SET role = 'team_member'
    WHERE team_id = p_team_id
      AND user_id = current_user_id;

    UPDATE public.team_members
    SET role = 'team_leader'
    WHERE team_id = p_team_id
      AND user_id = p_new_leader_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_team_leadership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_team_leadership(uuid, uuid) TO authenticated;
