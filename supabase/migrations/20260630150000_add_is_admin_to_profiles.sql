-- Global-admin flag. Admins manage ALL surveys via /admin (not team-scoped);
-- everyone else is a team-scoped student via /student.
ALTER TABLE "public"."profiles"
    ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false;

-- Students authenticate with their own JWT (role "authenticated"), and RLS lets
-- them update/insert their own profile row. Remove column-level privileges on
-- is_admin so they cannot escalate themselves to admin. The backend uses the
-- service role, which bypasses these grants, so admin promotion is DB/server-only.
REVOKE UPDATE ("is_admin") ON "public"."profiles" FROM "authenticated", "anon";
REVOKE INSERT ("is_admin") ON "public"."profiles" FROM "authenticated", "anon";

-- One-time seeding (run manually after an admin has signed in at least once):
--   UPDATE public.profiles SET is_admin = true WHERE email = 'you@thinktank.thecyc.org';
