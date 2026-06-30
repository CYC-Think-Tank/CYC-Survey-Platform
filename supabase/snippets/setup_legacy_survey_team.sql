-- LOCAL CLONED DATABASE ONLY. Do not run this file against production.
-- Creates/fetches the CYC Admin team, assigns the specified leader, and moves
-- the three seeded surveys plus every currently inactive survey to that team.

DO $$
DECLARE
    target_team_id uuid;
    target_leader_id uuid;
    original_survey_count integer;
BEGIN
    SELECT id
    INTO target_leader_id
    FROM public.profiles
    WHERE lower(email) = 'sylvia.zhang@thecyc.org'
    LIMIT 1;

    IF target_leader_id IS NULL THEN
        RAISE EXCEPTION 'Create/sign in as sylvia.zhang@thecyc.org before running this local setup';
    END IF;

    SELECT count(*)
    INTO original_survey_count
    FROM public.surveys
    WHERE id IN (
        '33b6cce7-c0b5-4c1c-93f5-daa439e37bf8'::uuid,
        '1114fdd1-7a8a-4473-b066-90f31d910f5f'::uuid,
        'adcff66e-1a98-40ee-99af-bce7ae9df099'::uuid
    );

    IF original_survey_count <> 3 THEN
        RAISE EXCEPTION 'Expected all three original seeded surveys, found %', original_survey_count;
    END IF;

    SELECT id
    INTO target_team_id
    FROM public.teams
    WHERE name = 'CYC Admin'
    ORDER BY created_at
    LIMIT 1;

    IF target_team_id IS NULL THEN
        INSERT INTO public.teams (name, created_by)
        VALUES ('CYC Admin', target_leader_id)
        RETURNING id INTO target_team_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.team_members
        WHERE team_id = target_team_id
          AND role = 'team_leader'
          AND user_id <> target_leader_id
    ) THEN
        RAISE EXCEPTION 'CYC Admin already has another leader; transfer leadership in the admin UI first';
    END IF;

    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (target_team_id, target_leader_id, 'team_leader')
    ON CONFLICT (team_id, user_id)
    DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.surveys
    SET team_id = target_team_id,
        owner_user_id = COALESCE(owner_user_id, target_leader_id),
        updated_at = timezone('utc'::text, now())
    WHERE id IN (
        '33b6cce7-c0b5-4c1c-93f5-daa439e37bf8'::uuid,
        '1114fdd1-7a8a-4473-b066-90f31d910f5f'::uuid,
        'adcff66e-1a98-40ee-99af-bce7ae9df099'::uuid
    )
       OR is_active = false;

    RAISE NOTICE 'Assigned legacy and inactive surveys to team %', target_team_id;
END;
$$;
