# CI/CD Pipeline & Docker Dev Environment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions CI/CD pipeline (lint + type-check + build) and Docker Compose local dev environment (Postgres + FastAPI).

**Architecture:** Single CI workflow file with two parallel jobs (frontend + backend) triggered on PRs and pushes to main. Docker Compose spins up local Postgres (with schema auto-applied) + FastAPI API for offline development. Next.js stays on host — Vercel handles production.

**Tech Stack:** GitHub Actions, Docker Compose, Node 22, Python 3.12, ESLint, TypeScript, ruff, Postgres 16.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `.github/workflows/ci.yml` | Create | CI pipeline definition |
| `package.json` | Modify | Add `"test"` placeholder script |
| `requirements.txt` | Modify | Add `ruff` for Python linting |
| `Dockerfile` | Create | Python 3.12 FastAPI container |
| `docker-compose.yml` | Create | Local dev stack (Postgres + API) |
| `.dockerignore` | Create | Exclude files from Docker build context |

---

### Task 1: Create GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow directory and file**

```bash
mkdir -p .github/workflows
```

Write `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run build

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt
      - run: ruff check api/
```

- [ ] **Step 2: Commit the workflow file**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, type-check, build)"
```

---

### Task 2: Add test placeholder to package.json

**Files:**
- Modify: `package.json:5-9`

- [ ] **Step 1: Add `"test"` script**

Edit `package.json`. Replace the scripts block:

```json
"scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "echo 'No tests yet'"
},
```

- [ ] **Step 2: Verify the script works**

Run: `npm run test`
Expected: Outputs "No tests yet" and exits 0

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test placeholder script to package.json"
```

---

### Task 3: Add ruff to requirements.txt

**Files:**
- Modify: `requirements.txt:80`

- [ ] **Step 1: Append ruff to requirements.txt**

Add after line 80 (`pdfplumber==0.11.8`):

```
ruff==0.14.10
```

- [ ] **Step 2: Install ruff and verify it works**

```bash
pip install ruff
ruff check api/ --show-source
```

Note: if ruff reports issues, note them but don't fix them — those are pre-existing. The goal is to confirm ruff runs.

- [ ] **Step 3: Commit**

```bash
git add requirements.txt
git commit -m "chore: add ruff to Python requirements"
```

---

### Task 4: Create Dockerfile

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY db_scripts/ ./db_scripts/

EXPOSE 8000

CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Build the Docker image**

```bash
docker build -t cyc-api .
```

Expected: Build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "docker: add Dockerfile for FastAPI backend"
```

---

### Task 5: Create docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: cyc_survey
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - ./db_scripts/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
      - pgdata:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env.local
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  pgdata:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "docker: add docker-compose.yml for local dev stack"
```

---

### Task 6: Create .dockerignore

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Write .dockerignore**

```
node_modules
.next
venv
__pycache__
*.pyc
.vercel
.git
.gitignore
.env
.env.local
.DS_Store
*.md
graphify-out
docs
public
src
frontend
```

- [ ] **Step 2: Commit**

```bash
git add .dockerignore
git commit -m "docker: add .dockerignore to exclude non-API files"
```

---

### Task 7: Local verification — CI commands

This task simulates what GitHub Actions will run, to confirm all commands pass locally before pushing.

- [ ] **Step 1: Run ESLint**

```bash
npm run lint
```

Expected: Passes (or shows existing warnings but exits 0). If it fails, fix the lint errors.

- [ ] **Step 2: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No type errors. If errors exist, note them — these are pre-existing and not caused by this PR. The workflow will catch them going forward.

- [ ] **Step 3: Run Next.js production build**

```bash
npm run build
```

Expected: Successful build with no errors.

- [ ] **Step 4: Run ruff on Python backend**

```bash
ruff check api/
```

Expected: Runs without crashing. Note any pre-existing lint issues.

- [ ] **Step 5: Verify all checks pass locally**

All four commands should exit 0 (or report pre-existing issues consistently). If any command fails in a way that would fail CI, fix it before proceeding.

---

### Task 8: Docker verification

- [ ] **Step 1: Start the Docker stack**

```bash
docker compose up -d
```

Expected: Postgres and API containers start. Postgres initializes with `schema.sql`.

- [ ] **Step 2: Check running containers**

```bash
docker compose ps
```

Expected: Both `postgres` and `api` services show status "Up" or "healthy".

- [ ] **Step 3: Check API is reachable**

```bash
curl -s http://localhost:8000/docs | head -5
```

Expected: Returns HTML for the FastAPI Swagger docs page.

- [ ] **Step 4: Check API health endpoint (if it exists)**

```bash
curl -s http://localhost:8000/
```

Expected: Any response (not connection refused). May return 404 if no root route — that's fine.

- [ ] **Step 5: Tear down**

```bash
docker compose down
```

---

### Task 9: Create feature branch and push

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/ci-cd-docker
```

All previous commits from Tasks 1-6 should be on this branch.

- [ ] **Step 2: Verify commit history**

```bash
git log --oneline -10
```

Expected: 6 commits (ci workflow, test placeholder, ruff dep, Dockerfile, compose, dockerignore).

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/ci-cd-docker
```

If the CI workflow is already active on push, GitHub Actions will run as soon as you push. Open a PR on GitHub to see the checks in action.
