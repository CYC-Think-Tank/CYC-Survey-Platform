-- Supabase Auth is used for admin accounts only. Public survey respondents do
-- not create Auth users, so this hook does not affect survey submissions.

CREATE OR REPLACE FUNCTION public.restrict_admin_signup_domain(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    signup_email text := lower(trim(event->'user'->>'email'));
    signup_domain text;
BEGIN
    signup_domain := split_part(signup_email, '@', 2);

    IF signup_email = '' OR signup_domain <> 'thecyc.org' THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 403,
                'message', 'Admin accounts require an @thecyc.org email address.'
            )
        );
    END IF;

    RETURN '{}'::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION public.restrict_admin_signup_domain(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restrict_admin_signup_domain(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.restrict_admin_signup_domain(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.restrict_admin_signup_domain(jsonb) TO supabase_auth_admin;
