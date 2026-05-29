# Phase 1: Testing Foundation Design

> **Scope:** Issue #17, Section 1 — "Run Tests in CI" + E2E coverage. Establishes testing infrastructure for both frontend and backend before later CI hardening and refactoring phases.

**Goal:** Add comprehensive automated tests (unit, integration, E2E) to the CYC Survey Platform and wire them into the existing CI pipeline, replacing the `echo 'No tests yet'` placeholder.

**Architecture:** Frontend uses Vitest + React Testing Library for unit tests and Playwright for E2E browser tests. Backend uses pytest for both unit tests (extracted pure functions) and integration tests (migrated from 6 ad-hoc root-level scripts). All test suites run in GitHub Actions CI alongside existing lint/build steps.

**Tech Stack:** Vitest, React Testing Library, jsdom, Playwright, pytest, httpx, pytest-asyncio.

---

## 1. Context & Motivation

The current CI pipeline (`.github/workflows/ci.yml`) runs lint, typecheck, and build for the frontend, and `ruff` for the backend. No actual tests execute. The `npm test` script in `package.json` is literally `echo 'No tests yet'`. On the backend, there are 6 ad-hoc Python test scripts at the repository root (`test_logic_gating_persistence.py`, `test_endpoints.py`, etc.) that are integration tests hitting a live API server, but they are not organized, not discoverable by pytest, and not run in CI.

This design formalizes the existing integration tests into a proper `tests/` directory, adds unit tests to both frontend and backend, adds E2E browser tests with Playwright, and wires all three layers into CI.

## 2. Frontend Tests (Vitest + React Testing Library)

### 2.1 Test Configuration

- `vitest.config.ts` configures Vitest with `@vitejs/plugin-react`, jsdom environment, and `tests/setup.ts` for global test utilities (jest-dom matchers).
- `package.json` adds scripts: `test` (run once), `test:watch` (watch mode), `test:e2e` (Playwright).
- `package.json` adds devDependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.

### 2.2 Component Tests

| File | What It Tests |
|------|--------------|
| `src/components/__tests__/Footer.test.tsx` | Renders org info, Instagram link, mailing list link |
| `src/components/__tests__/RichTextEditor.test.tsx` | Renders editor, applies formatting, handles content changes |
| `src/components/__tests__/AiInsightsTab.test.tsx` | Renders insights, handles loading/error states |

### 2.3 Page Tests

| File | What It Tests |
|------|--------------|
| `src/app/__tests__/page.test.tsx` | Landing page renders hero, survey cards, raffle popup, CTA buttons |
| `src/app/survey/[id]/__tests__/page.test.tsx` | Survey page renders questions, handles submission flow |
| `src/app/admin/__tests__/page.test.tsx` | Admin dashboard renders survey table |
| `src/app/admin/login/__tests__/page.test.tsx` | Login form renders, handles auth state |

### 2.4 API Route Tests

| File | What It Tests |
|------|--------------|
| `src/app/api/cron/reminders/__tests__/route.test.ts` | Validates cron secret, returns 200 on valid secret, 401 on invalid/missing secret |

### 2.5 Utility Tests

| File | What It Tests |
|------|--------------|
| `src/lib/__tests__/supabase.test.ts` | Client initializes correctly, handles missing env vars gracefully |

### 2.6 Mocking Strategy

- **Supabase client:** Mock `@supabase/supabase-js` `createClient` to return a mock client with predictable `from()`, `select()`, `insert()`, `update()`, `delete()` methods.
- **Next.js router:** Mock `next/navigation` `useRouter`, `useParams`, `redirect`.
- **`fetch`:** Mock global `fetch` for API route tests.
- **`window` / `document`:** jsdom provides DOM environment; mock `matchMedia` and `IntersectionObserver` if needed.

## 3. Backend Tests (pytest)

### 3.1 Directory Structure

```
tests/
├── __init__.py
├── conftest.py              # Shared fixtures (none at top level)
├── integration/
│   ├── __init__.py
│   ├── conftest.py          # base_url, auth_headers, cleanup_surveys fixtures
│   ├── test_logic_gating_persistence.py
│   ├── test_endpoints.py
│   ├── test_short_answer_validation.py
│   ├── test_query.py
│   ├── test_limit.py
│   ├── test_fast.py
│   ├── test_survey_crud.py
│   ├── test_survey_submission.py
│   └── test_admin_auth.py
└── unit/
    ├── __init__.py
    └── test_utils.py
```

### 3.2 Integration Tests

All integration tests use `requests` (or `httpx`) to hit a running API server. The `conftest.py` provides:

- `base_url` fixture: Defaults to `http://127.0.0.1:8000`, overridable via `CYC_API_URL` env var.
- `cleanup_surveys()` fixture: A context manager that tracks created survey IDs via `requests.post()` and deletes them in teardown.
- `auth_headers()` fixture: Empty dict for public endpoints; can be extended later for admin routes.

Migrated scripts keep their test flows but are refactored to:
- Use plain `assert` instead of custom `assert_eq()` (pytest provides rich diffs).
- Use `cleanup_surveys` fixture for teardown instead of inline `try/finally`.
- Use parameterized fixtures where appropriate.

| File | Coverage |
|------|----------|
| `test_logic_gating_persistence.py` | Create → GET → update → duplicate → toggle active; verify logic gates persist through all operations |
| `test_endpoints.py` | Smoke test all critical API endpoints (surveys, results) |
| `test_short_answer_validation.py` | Short answer input validation rules |
| `test_query.py` | Database query patterns |
| `test_limit.py` | Rate limiting / pagination behavior |
| `test_fast.py` | Performance smoke tests |
| `test_survey_crud.py` | Create, read, update, delete, duplicate surveys |
| `test_survey_submission.py` | Submit answers, verify storage, logic gate evaluation on submission |
| `test_admin_auth.py` | Admin login, password validation, unauthorized access rejection |

### 3.3 Unit Tests

Extracted from `api/index.py` into `api/utils/survey_utils.py`:

| Function | What It Does | Test File |
|----------|--------------|-----------|
| `remap_question_ids(survey, old_to_new)` | Remaps question UUIDs during survey duplicate | `test_utils.py` |
| `validate_logic_gate(gate, available_question_ids)` | Validates gate structure and references | `test_utils.py` |
| `compute_visible_questions(questions, answers, logic_gates)` | Pure function for conditional question visibility | `test_utils.py` |

These functions take dicts in, return dicts out — no DB, no FastAPI context. Easy to unit test with static data.

### 3.4 Minimal Refactor

`api/index.py` (~1,816 lines) imports the extracted functions from `api.utils.survey_utils` instead of defining them inline. This is the only backend code change — no route reorganization, no service layer extraction. That comes in the dedicated refactor phase.

## 4. E2E Tests (Playwright)

Playwright runs against a fully deployed local stack (frontend on port 3000, backend on port 8000, DB via docker-compose).

| File | Flow |
|------|------|
| `e2e/survey-flow.spec.ts` | Visit landing → click a survey → answer questions (including conditional logic) → submit → verify thank-you page |
| `e2e/admin-flow.spec.ts` | Visit /admin → login with password → create a survey → verify it appears in the admin dashboard |

Playwright tests run only in CI (on `ubuntu-latest` with `playwright install --with-deps`) or manually via `npm run test:e2e`. They do NOT run on `npm test` (too slow for local dev).

## 5. CI Integration

Update `.github/workflows/ci.yml`:

```yaml
jobs:
  frontend:
    # ... existing steps ...
    - run: npm test          # NEW: Vitest unit tests
    - run: npm run test:e2e  # NEW: Playwright E2E (optional, can be separate job)

  backend:
    # ... existing steps ...
    - run: pytest            # NEW: pytest unit + integration tests
```

**Backend CI considerations:** Integration tests need a running API server + DB. Two options:

1. **Option A (simpler):** Only run unit tests in CI (`pytest tests/unit/`). Integration tests run locally and on-demand.
2. **Option B (comprehensive):** Spin up PostgreSQL + backend in CI using `services:` and `docker-compose`, then run all tests.

*Recommendation: Start with Option A for immediate value, add Option B in Phase 2 (CI hardening) when we add health endpoints and Docker improvements.*

## 6. Error Handling & Edge Cases

- **Missing env vars:** `supabase.test.ts` verifies graceful failure when `NEXT_PUBLIC_SUPABASE_URL` is missing.
- **Invalid auth:** `test_admin_auth.py` verifies 401/403 on missing or wrong admin password.
- **Malformed surveys:** `test_survey_crud.py` verifies validation rejects surveys with missing required fields.
- **Logic gate cycles:** `test_logic_gating_persistence.py` includes a test for invalid gate references (question referencing itself or non-existent question).
- **Duplicate edge cases:** `test_utils.py` verifies `remap_question_ids` handles empty surveys, single-question surveys, and deeply nested logic gates.

## 7. Dependencies & Requirements

**Frontend additions to `package.json` devDependencies:**
- `vitest`
- `@vitejs/plugin-react`
- `jsdom`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

**Backend additions to `requirements.txt`:**
- `pytest`
- `pytest-asyncio`
- `httpx`

**Playwright (separate install):**
- `playwright` (npm devDependency, binaries installed via `npx playwright install`)

## 8. Deferred to Later Phases

The following are explicitly out of scope for Phase 1:

- **Prettier / formatting enforcement** → Phase 2
- **Pre-commit hooks** → Phase 2
- **CodeQL / Dependabot / secret scanning** → Phase 3
- **Frontend Dockerfile / multi-stage compose** → Phase 4
- **Health endpoints** → Phase 4
- **Sentry configuration** → Phase 4
- **Alembic migrations** → Phase 5
- **Backend service-layer refactor** → Dedicated refactor phase after Phase 5
- **Admin edit/results/create page unit tests** → Phase 2 (needs stable component APIs)
- **LanguageContext / HeaderFooter unit tests** → Phase 2 (simple wrappers, covered by E2E)

## 9. Acceptance Criteria

- [ ] `npm test` runs and passes all frontend unit tests.
- [ ] `pytest tests/unit/` runs and passes all backend unit tests.
- [ ] `pytest tests/integration/` runs and passes all backend integration tests locally.
- [ ] `npm run test:e2e` runs and passes both Playwright smoke tests locally.
- [ ] CI workflow runs `npm test` and `pytest tests/unit/` on every PR and push to main.
- [ ] All 6 ad-hoc `test_*.py` scripts at root are deleted (migrated into `tests/integration/`).
- [ ] `package.json` `test` script no longer echoes "No tests yet".
- [ ] No regressions in existing lint/build CI steps.

---

*Design approved: 2026-05-29*
*Next step: Write implementation plan using writing-plans skill.*
