# Production Operations Runbook

This runbook covers hosted Supabase migrations, backups, Vercel deployment, verification, rollback, and incidents. Production work should be performed by an authorized operator with a second person reviewing commands that can change data.

## Golden Rules

- Never run `supabase db reset` against production. It recreates the database and destroys rows.
- Never run local seed files, generated-response scripts, or legacy backfill snippets against production.
- Never assume `.env.local` controls the Supabase CLI link. Verify the linked project separately.
- Never paste production service-role keys into browser code, tickets, chat, screenshots, or shell history.
- Never edit an applied migration to deploy a new change; create a new migration.
- Back up and inspect before applying a schema or data migration.
- Prefer additive, backward-compatible changes and deploy in an order that keeps old and new application versions functional.

## Environment Identification

The following identify different targets:

- `.env.local` controls application environment variables.
- `supabase/config.toml` configures local Supabase behavior.
- `supabase link --project-ref ...` sets the hosted project targeted by linked CLI commands.
- The Vercel project and environment determine deployed application variables.

Before any production operation:

```bash
supabase projects list
supabase migration list --linked
```

Compare the linked project reference with the production project's **Project Settings > General > Reference ID** in the Supabase dashboard. Also inspect the hostname in `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`; do not print keys.

## Change Preparation

1. Review every pending file under `supabase/migrations/` in timestamp order.
2. Identify DDL, DML/backfills, locks, RLS/grant changes, and assumptions about existing rows.
3. Apply the complete chain to a fresh local database with `supabase db reset`.
4. Test upgrading a production-like copy when existing data or constraints are involved.
5. Run `supabase db lint --local --level error`.
6. Run application tests and the production build.
7. Write verification queries and a rollback/forward-fix plan before deployment.
8. Schedule and communicate the change if it can lock tables, send email, or interrupt users.

## Backups

Use the hosted project's Supabase backup/PITR capabilities where available and verify that a restorable backup exists before migration. For an operator-managed logical backup, use an approved secure destination outside the repository.

Example schema-only inspection command:

```bash
supabase db dump --linked --schema public --file /secure/path/pre-migration-schema.sql
```

Exact backup commands and flags depend on the installed Supabase CLI version and project plan. Check `supabase db dump --help` before running them. Protect dumps as sensitive production data, record their creation time, and test restoration procedures periodically.

Do not commit files under `backups/` or new production dumps. TODO: Move or remove historical repository backups after confirming retention obligations and access controls.

## Applying Supabase Migrations

Login and link are non-mutating by themselves:

```bash
supabase login
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF
```

They authenticate the CLI and select its hosted target. They do not apply migrations.

Inspect local-versus-remote migration state:

```bash
supabase migration list --linked
```

Preview pending changes when supported by the installed CLI:

```bash
supabase db push --linked --dry-run
```

Read the preview. If the CLI version does not support this flag, stop and inspect the SQL files manually rather than guessing.

Apply only after backup, review, and target confirmation:

```bash
supabase db push --linked
```

This applies pending migration files in timestamp order and records them in Supabase migration history. It may alter or update data if the SQL files contain such statements. The command's safety is determined by the migration contents, not by the command name.

Some hosted Auth features require dashboard configuration after SQL deployment. For example, configure the Before User Created hook to use `public.restrict_admin_signup_domain` when the corresponding migration is deployed. Local `config.toml` does not configure the hosted project.

## Application Deployment

The application is configured for Vercel through `vercel.json`; `/api/*` requests are rewritten to the FastAPI entrypoint except for Next.js cron routes. Production environment variables must be configured in the Vercel production environment.

Recommended order for backward-compatible changes:

1. Apply additive database changes.
2. Verify schema, grants, policies, functions, and existing row counts.
3. Deploy application code.
4. Run smoke tests.
5. Complete deferred constraints or cleanup in a later migration.

For a breaking contract, use an expand-and-contract sequence across multiple releases.

## Post-Deployment Verification

At minimum, verify with designated test accounts and synthetic data:

- Public survey listing and survey-taking
- Submission persistence without exposing respondent data
- Student sign-in, team-scoped survey visibility, and role restrictions
- Global administrator sign-in and intended cross-team visibility
- Team joining, approval, leadership transfer, and leaving behavior
- Survey create, edit, activate/deactivate, results, and authorized deletion
- Raffle and analytics endpoints relevant to the release
- Cron authorization without manually triggering a bulk send
- Error rates and deployment logs

For database changes, run read-only queries that confirm expected columns, constraints, policy definitions, memberships, ownership, and row counts. Save the verification result with the release record without including sensitive rows.

## Rollback and Forward Fixes

Reverting application code does not undo database migrations. Prefer a forward-fix migration for schema defects, especially after new writes have used the schema.

Before rollback:

1. Stop ongoing harmful writes or email jobs.
2. Determine whether the old application remains compatible with the current schema.
3. Preserve data written since deployment.
4. Choose application rollback, forward schema fix, or point-in-time recovery with the production owner.
5. Verify authorization and row counts after recovery.

Do not delete columns, tables, or production rows merely to make a rollback compile. Destructive restoration should follow an approved incident process.

## Incident Procedure

1. Record the symptom, detection time, deployment, migration, and affected environment.
2. Pause the responsible workflow if it is safe to do so.
3. Notify the production owner and security contact when data or access may be involved.
4. Preserve logs and backups.
5. Contain the issue with the smallest reversible action.
6. Verify public survey availability and data integrity.
7. Recover using a reviewed forward fix, rollback, or restoration plan.
8. Monitor after recovery and document the incident and prevention work.

For accidental bulk email, disable the sending path or credentials as needed, preserve provider logs, determine recipients and message content, and coordinate the response with organizational leadership.

## Production Data Backfills

Write one-time production data changes as reviewed, idempotent migrations or carefully reviewed SQL transactions. Include:

- A read-only preview query
- Exact intended row count and selection criteria
- A backup table in a private/non-exposed schema when needed
- Transaction boundaries
- Post-update verification
- A reversal query or documented forward-fix plan

Never reuse `supabase/snippets/setup_legacy_survey_team.sql` in production; it is explicitly intended for the cloned local database.

## Operational Record

For each production change, record:

- Operator and reviewer
- UTC start/end time
- Git commit and deployment URL
- Migration versions applied
- Backup/PITR status
- Verification outcome
- Incidents, deviations, or follow-up tasks

TODO: Add the organization's production owners, Vercel project, Supabase project reference verification procedure, monitoring links, maintenance window, and incident communications channel.
