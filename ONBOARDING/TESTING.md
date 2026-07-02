# Testing Guide

This document explains how the CYC Survey Platform is tested, which environment each test layer expects, and what contributors should run before opening a pull request.

## Table of Contents

- [Test Layers](#test-layers)
- [Prerequisites](#prerequisites)
- [Frontend Tests](#frontend-tests)
- [Backend Tests](#backend-tests)
- [Integration Tests](#integration-tests)
- [End-to-End Tests](#end-to-end-tests)
- [Static Checks and Builds](#static-checks-and-builds)
- [Continuous Integration](#continuous-integration)
- [Writing Tests](#writing-tests)
- [Fixtures and Test Data](#fixtures-and-test-data)
- [Troubleshooting](#troubleshooting)
- [Known Gaps](#known-gaps)

## Test Layers

| Layer                   | Tool                                 | Location                 | Purpose                                                                                           |
| ----------------------- | ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| Frontend unit/component | Vitest, React Testing Library, jsdom | `src/**/*.test.{ts,tsx}` | Components, client logic, and Next.js route handlers                                              |
| Backend unit            | Pytest                               | `tests/unit/`            | FastAPI services, authorization helpers, analytics, and route behavior with isolated dependencies |
| Backend integration     | Pytest                               | `tests/integration/`     | Survey CRUD, submission, validation, and database-backed behavior                                 |
| Browser E2E             | Playwright, Chromium                 | `e2e/`                   | Critical admin and public survey workflows through a running application                          |
| Static verification     | ESLint, TypeScript, Ruff, Prettier   | Repository-wide          | Syntax, types, formatting, and common defects                                                     |
| Build verification      | Next.js, Docker                      | CI and local commands    | Production compilation and container buildability                                                 |

Tests must never use production credentials or send real email. Use mocks, a local Supabase instance, or a dedicated disposable test project.

## Prerequisites

- Node.js 22 and dependencies installed with `npm ci`
- Python 3.12 and dependencies installed with `pip install -r requirements.txt`
- Chromium installed for browser tests with `npx playwright install chromium`
- Local Supabase running when a database-backed test requires it

The Python project declares support for Python 3.9+, but CI currently verifies Python 3.12. Prefer 3.12 locally to match CI.

## Frontend Tests

Run the complete Vitest suite once:

```bash
npm test
```

Run in watch mode while developing:

```bash
npm run test:watch
```

Run one file or tests matching a name:

```bash
npx vitest run src/app/student/__tests__/page.test.tsx
npx vitest run -t "redirects unauthenticated users"
```

Vitest uses `tests/setup.ts`, the `jsdom` environment, and the `@` alias for `src/`. Tests should mock network and Supabase boundaries rather than relying on developer credentials.

To inspect coverage locally:

```bash
npx vitest run --coverage
```

Coverage is informational; no minimum threshold is currently enforced.

## Backend Tests

Run the backend unit suite used by CI:

```bash
pytest tests/unit/ -v
```

Run an individual module or test:

```bash
pytest tests/unit/test_admin_access.py -v
pytest tests/unit/test_admin_access.py::test_name -v
```

Unit tests should replace external services, Supabase calls, Gemini calls, R execution, and email delivery with controlled fakes or mocks.

## Integration Tests

Integration tests live in `tests/integration/`. They cover API behavior that spans multiple modules and may expect a configured database or running backend.

```bash
pytest tests/integration/ -v
```

Before running them:

1. Read `tests/integration/conftest.py` for the fixtures and required environment.
2. Point every database variable at local Supabase or a disposable test project.
3. Reset or seed that test database only if the selected tests require it.
4. Never substitute a production URL or service-role key.

Integration tests are not currently part of the default CI workflow, so contributors changing persistence behavior must run the relevant files manually.

## End-to-End Tests

Playwright tests live in `e2e/` and default to `http://localhost:3000`. Outside CI, Playwright starts `npm run dev` automatically or reuses an existing server.

```bash
npm run test:e2e
```

To target another non-production environment:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

Useful debugging commands:

```bash
npx playwright test --ui
npx playwright test --headed
npx playwright show-report
```

The E2E job is intentionally disabled in `.github/workflows/ci.yml` until a staging environment is available. Do not point destructive E2E scenarios at production.

## Static Checks and Builds

Run the same core checks as CI:

```bash
npm run lint
npx tsc --noEmit
npm run format:check
npm run build
ruff check api/ tests/
ruff format --check api/ tests/
```

The pre-commit hook runs `lint-staged` for staged frontend and documentation files. The separate Python pre-commit configuration runs Ruff when installed with `pre-commit install`.

## Continuous Integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`:

- Frontend: install, ESLint, TypeScript, production build, and Vitest
- Backend: install, Ruff checks, and backend unit tests
- Docker: frontend and backend image builds
- E2E: defined but currently disabled

CodeQL scans JavaScript and Python on pushes, pull requests, and a weekly schedule. The npm security audit runs on `main` and weekly.

## Writing Tests

Add tests at the narrowest useful layer:

- Put component and TypeScript route tests beside the code under `__tests__/`.
- Put isolated Python behavior in `tests/unit/`.
- Put database/API boundary behavior in `tests/integration/`.
- Reserve Playwright for important workflows that cannot be represented reliably below the browser layer.

Every bug fix should include a regression test when practical. Authorization changes should test unauthenticated, unauthorized, ordinary member, team leader, and global administrator cases as applicable. Survey changes should also verify that public survey-taking remains functional.

Avoid assertions tied to animation timing, generated UUIDs, row order without an explicit sort, or developer-specific seeded records.

## Fixtures and Test Data

- Frontend global setup: `tests/setup.ts`
- Backend integration fixtures: `tests/integration/conftest.py`
- Local Supabase migrations and baseline seed: `supabase/migrations/` and `supabase/seed.sql`
- Guarded generated response data: `scripts/seed_local_active_surveys.py`

Use deterministic identifiers and data where possible. Generated local data must not be committed unless it is an intentional fixture.

## Troubleshooting

### Frontend tests cannot resolve `@/...`

Run through Vitest rather than invoking a test file directly. The alias is configured in `vitest.config.ts`.

### Browser tests cannot connect

Check that port 3000 is free, `PLAYWRIGHT_BASE_URL` is correct, and the application has valid local environment variables.

### Database-backed tests return 401 or 403

Verify that the test user, JWT, team membership, and local migration state match the scenario. Do not work around RLS with a production service-role key.

### Python imports fail

Run Pytest from the repository root with the project virtual environment active.

### A test sends email or calls Gemini

Stop the test and replace the external boundary with a mock. Local test runs must not create real operational side effects.

## Known Gaps

- TODO: Enable E2E tests in CI against an isolated staging environment.
- TODO: Define and enforce coverage expectations for security-critical modules.
- TODO: Make integration-test database provisioning reproducible in CI.
- TODO: Add a real-JWT integration test proving users cannot modify `profiles.is_admin`.
- TODO: Add production-like tests for RLS policies and migration upgrades from existing data.
