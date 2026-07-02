# Operational Scripts

The scripts in this directory are one-off maintenance, migration, translation, and local test-data utilities. They are not application runtime code and do not share a single safety standard. Read the full script and verify every environment variable before running one.

## Risk Labels

- **Source-only**: modifies checked-in source files but does not access the database.
- **Local-only guarded**: writes data but rejects non-local targets.
- **Local database**: intended for a developer database but may have hard-coded assumptions.
- **Production-capable**: can read or write whichever Supabase project its environment variables identify.
- **Legacy/ad hoc**: narrowly targeted repair code that should not be reused without review.

## Inventory

| Script                           | Risk                         | Purpose                                                                        | Important behavior                                                             |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `add_missing_keys.py`            | Source-only, external AI     | Adds selected missing keys to locale JSON files using Gemini                   | Requires `GOOGLE_AI_KEY`; rewrites locale files                                |
| `generate-ui-translations.py`    | Source-only, external AI     | Generates locale JSON files from English using Gemini                          | Skips existing locale files; review generated language                         |
| `extract_legacy_translations.py` | Source-only                  | Extracts embedded legacy French and Chinese strings                            | Writes locale JSON files from hard-coded historical content                    |
| `seed_local_active_surveys.py`   | Local-only guarded           | Appends deterministic generated sessions and answers for active surveys        | Rejects non-local hosts and supports `--dry-run`                               |
| `clone_prod_db.py`               | Production read, local write | Attempts to copy hosted table data into a hard-coded local PostgreSQL database | Uses service role, disables local triggers, and is legacy/incomplete           |
| `migrate_local.py`               | Local database               | Performs a local database transformation                                       | Contains a developer-specific hard-coded connection string; inspect before use |
| `fix_referral.js`                | Production-capable, legacy   | Rewrites one referral email in `share_links` and `raffle_entries`              | Target comes from environment; no dry run                                      |
| `fix_referral.py`                | Production-capable, legacy   | Repairs hard-coded referral/share-link records                                 | Uses service role and performs inserts/updates; no target guard                |
| `fix_erica.js`                   | Production-capable, legacy   | Repairs hard-coded referral and raffle records for one person                  | Performs inserts/updates with privileged credentials; no target guard          |

## General Safety Checklist

Before running any script:

1. Open and read the entire file.
2. Check `git status` and preserve unrelated work.
3. Identify every file, table, row selector, external API, and environment variable used.
4. Print or inspect the target hostname/project reference without exposing secrets.
5. Prefer a local clone and synthetic data.
6. Use `--dry-run` when available.
7. Back up affected production data and record expected row counts for an approved production operation.
8. Run from the repository root unless the script says otherwise.
9. Review the diff or database results immediately afterward.

Do not assume `.env.local` is local because of its filename. It can contain production URLs and keys.

## Recommended Local Response Seeder

`seed_local_active_surveys.py` is the safest database utility in this directory because it validates that the Supabase hostname is `localhost`, `127.0.0.1`, or `::1`.

Start and inspect local Supabase:

```bash
npx supabase start
npx supabase status
```

Preview without writing:

```bash
python scripts/seed_local_active_surveys.py --use-supabase-status --dry-run
```

Append generated responses:

```bash
python scripts/seed_local_active_surveys.py --use-supabase-status --responses-per-survey 1000
```

See `docs/local_supabase_clone.md` for the complete workflow. The script appends rows; rerunning it creates additional generated sessions.

## Translation Scripts

The translation scripts call Google Gemini and modify `src/locales/*.json`. Run them only when intentionally updating source translations:

```bash
GOOGLE_AI_KEY=... python scripts/generate-ui-translations.py
GOOGLE_AI_KEY=... python scripts/add_missing_keys.py
```

Review every locale diff for missing keys, altered placeholders, malformed HTML, terminology, and JSON validity. AI output requires human language review before release.

`extract_legacy_translations.py` uses hard-coded historical strings and should normally be treated as an archival migration utility, not the current translation workflow.

## Legacy Data Repair Scripts

`fix_referral.js`, `fix_referral.py`, and `fix_erica.js` contain hard-coded identities and perform privileged writes without target guards or dry-run modes. Do not run them as general maintenance commands. If a similar repair is needed:

1. Write a read-only query that proves the affected rows.
2. Create a reviewed, parameterized, idempotent replacement.
3. Add explicit target confirmation and dry-run behavior.
4. Back up the selected rows.
5. Execute under the production operations process.

Keep these scripts only as historical context until maintainers decide whether to archive or remove them.

## Clone and Local Migration Scripts

`clone_prod_db.py` reads hosted data using `SUPABASE_URL` and `SUPABASE_KEY`, then writes to a hard-coded local PostgreSQL database while disabling triggers. It can expose sensitive production data locally and should not be the default clone workflow. Use `docs/local_supabase_clone.md` and approved sanitized data instead.

`migrate_local.py` also contains a developer-specific PostgreSQL connection string. Update or replace it with a guarded, configurable migration before use; do not point it at hosted databases.

## Adding a Script

New operational scripts should:

- Have a module-level purpose and usage example
- Parse explicit arguments instead of embedding identities or connection strings
- Fail closed unless the target environment is unambiguous
- Support `--dry-run` for writes
- Print planned and actual row counts without printing sensitive content
- Be idempotent or clearly document rerun behavior
- Use transactions for related writes
- Avoid service-role credentials when user-scoped access is sufficient
- Include tests for target guards and selection logic
- Add an entry to this inventory

If the change belongs in normal schema history, create a Supabase migration instead of a script.
