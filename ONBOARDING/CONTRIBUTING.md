# Contributing Guide

Thank you for contributing to the CYC Survey Platform. This guide describes the repository's expected development and review workflow.

## Before You Begin

Read the following documents before changing behavior across system boundaries:

- `ONBOARDING/ONBOARDING.md` for setup and codebase orientation
- `ONBOARDING/ARCHITECTURE.md` for component, database, and authorization boundaries
- `TESTING.md` for verification expectations
- `SECURITY.md` for credential and vulnerability handling
- `ONBOARDING/production-operations.md` before any hosted database or deployment operation

## Branches

Do not develop directly on `main`. Start from an up-to-date local `main` and create a short-lived branch:

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

Use a descriptive prefix such as `feature/`, `fix/`, `docs/`, `test/`, or `chore/`. If your organization has a ticket naming convention, use that convention instead.

Keep branches focused. Separate unrelated refactors, generated artifacts, data operations, and user-facing behavior into different pull requests.

## Making Changes

1. Confirm which layer owns the behavior before editing.
2. Prefer existing patterns and APIs over introducing a parallel abstraction.
3. Keep public survey-taking compatible when changing admin, student, team, or survey code.
4. Add or update tests at the narrowest useful layer.
5. Update documentation when commands, environment variables, APIs, schema, or operational behavior change.
6. Never commit credentials, production exports, respondent data, or local build output.

Database changes belong in a new timestamped file under `supabase/migrations/`. Do not edit an already-applied migration to represent a new change. Treat RLS policies, grants, indexes, data backfills, and rollback implications as part of the schema change.

## Formatting and Verification

Run the relevant checks before committing. For changes spanning both applications, run the full set:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run format:check
npm run build
ruff check api/ tests/
ruff format --check api/ tests/
pytest tests/unit/ -v
```

Run relevant integration and E2E tests as described in `TESTING.md`. Documentation-only changes should at least pass:

```bash
npx prettier --check "**/*.md"
```

The Git hook formats and lints supported staged files, but it does not replace the full verification suite.

## Commits

Write small commits with imperative, descriptive subjects:

```text
Enforce team ownership in survey updates
Add regression test for pending team redirect
Document local migration workflow
```

Avoid vague subjects such as `fix`, `updates`, or `changes`. Do not mix formatting churn with behavioral work. Review `git diff --staged` before every commit, especially when environment or data files exist locally.

## Pull Requests

A pull request should explain:

- The problem and intended behavior
- The implementation and important tradeoffs
- Files or system boundaries affected
- Database migrations and deployment order
- Tests run and any tests not run
- Security, privacy, email, analytics, and public-survey impact
- Screenshots for visible UI changes
- Manual steps, environment variables, feature flags, or dashboard configuration
- Rollback considerations for operational changes

Keep the pull request's diff reviewable. Call out generated files and pre-existing issues rather than hiding them in the change.

## Review Expectations

Reviewers should prioritize:

1. Authorization, privacy, data loss, and production side effects
2. Behavioral correctness and preservation of public survey workflows
3. Migration safety and compatibility with existing rows
4. Failure handling and operational observability
5. Test quality and maintainability
6. Code clarity and style

At least one reviewer familiar with the affected area should approve before merge. Security-sensitive or production-data changes should receive an additional review from a maintainer with Supabase and deployment access.

Do not merge with failing required checks. Use a normal reviewed merge path; avoid rewriting shared history or force-pushing `main`.

## Releases and Deployments

Merging code and applying database changes are separate operations. The pull request must state the required order. Follow `ONBOARDING/production-operations.md` for backups, dry runs, migrations, verification, and rollback.

TODO: Document the team's preferred merge strategy, release ownership, approval requirements, and production deployment window.

## Getting Help

Ask in the team's normal engineering channel when ownership or expected behavior is unclear. Report suspected vulnerabilities privately according to `SECURITY.md`, not in a public issue.
