# Local Supabase Clone With Generated Survey Data

This workflow is for creating a local Supabase database that mirrors the checked-in schema and seed data, then appending randomly generated responses for the active surveys.

## Safety rules

- Do not run `db_scripts/seed.py` or `db_scripts/seed_responses.py` for this workflow. Those scripts load `.env.local`, which may point at the live Supabase project.
- Do not run `supabase db push` for this workflow.
- The local response seeder refuses any Supabase URL that is not `localhost`, `127.0.0.1`, or `::1`.
- The local response seeder appends generated rows only. It does not delete rows.

## Suggested local flow

Start local Supabase:

```bash
npx supabase start
```

Reset the local Supabase database from the checked-in migration and seed files:

```bash
npx supabase db reset
```

Record the local API URL and keys from:

```bash
npx supabase status
```

Create a local-only env file such as `.env.local.supabase`:

```bash
LOCAL_SUPABASE_URL=http://127.0.0.1:54321
LOCAL_SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

Preview the generated inserts without writing:

```bash
python scripts/seed_local_active_surveys.py --use-supabase-status --dry-run
```

Append generated responses for the 3 active surveys:

```bash
python scripts/seed_local_active_surveys.py --use-supabase-status --responses-per-survey 1000
```

To point the app at the local clone, use the local Supabase URL and local keys in your app environment. Keep production credentials out of `.env.local.supabase`.
