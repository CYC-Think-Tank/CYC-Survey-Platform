# CI/CD Pipeline & Docker Dev Environment — Design

**Date:** 2026-05-28
**Status:** Approved

---

## 1. GitHub Actions CI/CD Pipeline

### Trigger
- `pull_request` events (any PR opened, updated, or reopened)
- `push` events to `main` branch

### Workflow: `.github/workflows/ci.yml`

Single workflow file, two parallel jobs:

#### Job: `frontend`
| Step | Action |
|------|--------|
| Checkout | `actions/checkout@v4` |
| Setup Node | `actions/setup-node@v4`, Node 22 |
| Install deps | `npm ci` |
| Lint | `npm run lint` (ESLint) |
| Type-check | `npx tsc --noEmit` |
| Build check | `npm run build` (`next build`) |

#### Job: `backend`
| Step | Action |
|------|--------|
| Checkout | `actions/checkout@v4` |
| Setup Python | `actions/setup-python@v5`, Python 3.12 |
| Install deps | `pip install -r requirements.txt` |
| Lint | `ruff check api/` (add `ruff` to `requirements.txt`) |

### Test placeholder
- Add `"test": "echo 'No tests yet'"` to `package.json` scripts
- CI will include an optional `npm test` step that passes harmlessly
- When real tests are written, change `package.json` and CI picks it up

### What this catches
- ESLint violations (unused vars, wrong hooks usage, etc.)
- TypeScript errors (missing props, type mismatches, broken imports)
- Build failures (Next.js compilation errors, broken pages)
- Python syntax/logic issues (via ruff)

---

## 2. Docker Development Environment

### Approach
Local development only — does not replace Vercel production deployment. The Next.js frontend stays on the host machine (containerizing Next.js dev mode breaks hot reload and provides no value since Vercel handles production).

### Files

#### `Dockerfile`
- Base: `python:3.12-slim`
- Copies `requirements.txt`, installs dependencies
- Copies `api/` directory
- Runs FastAPI via uvicorn on port 8000

#### `docker-compose.yml`
Two services:

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `postgres:16` | Local database, auto-initializes `db_scripts/schema.sql` |
| `api` | builds from `Dockerfile` | FastAPI backend on port 8000 |

- API service depends on postgres
- API reads env vars from `.env.local`
- Postgres exposes port 5432 for local tooling

#### `.dockerignore`
Excludes: `node_modules`, `.next`, `venv`, `__pycache__`, `.vercel`, `.git`, `.env*` (env is mounted, not baked in)

### What this enables
- `git clone` + `docker compose up` = working backend + database with schema applied
- No Supabase account required for local development
- Identical environment across contributors

---

## 3. What's NOT Included
- **No test suite** — skeleton test placeholders only. Real tests should be written by someone who understands the business logic.
- **No production Docker deployment** — Vercel is the production platform. Docker is dev-only.
- **No Alembic/IaC** — Deferred. `vercel.json` already serves as infra config. Schema migration tooling is a separate project.
- **No cron job changes** — The existing `vercel.json` cron for email reminders is untouched.

---

## 4. Files Changed
| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | **Create** — CI workflow |
| `Dockerfile` | **Create** — Python API image |
| `docker-compose.yml` | **Create** — local dev stack |
| `.dockerignore` | **Create** — build exclusions |
| `package.json` | **Edit** — add `"test"` script |
| `requirements.txt` | **Edit** — add `ruff` |
