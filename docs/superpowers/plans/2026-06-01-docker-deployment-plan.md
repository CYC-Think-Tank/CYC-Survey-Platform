# Phase 4: Docker & Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker support for local frontend development and set up health endpoints. The backend already has a Dockerfile and docker-compose service.

**Architecture:** Existing `Dockerfile` builds the Python backend. We add a multi-service `docker-compose.yml` with frontend (Next.js) + backend (FastAPI) + optional PostgreSQL. Health endpoints verify both services are alive.

**Tech Stack:** Docker, Docker Compose, Vercel (unchanged).

---

## File Structure

```
# NEW FILES
api/Dockerfile          # Separate backend Dockerfile
docker-compose.dev.yml  # Development orchestration
src/app/health/route.ts # Frontend health endpoint

# MODIFIED FILES
Dockerfile              # Change to frontend-focused
docker-compose.yml      # Add frontend service, keep postgres
.github/workflows/ci.yml # Add Docker build check
package.json            # Add docker scripts
api/index.py            # Add /health endpoint
```

---

## Task 1: Create Separate Backend Dockerfile

**Files:**
- Create: `api/Dockerfile`
- Modify: `Dockerfile`

- [ ] **Step 1: Move backend Dockerfile**

The current `Dockerfile` is backend-only. Move it to `api/Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY db_scripts/ ./db_scripts/

EXPOSE 8000

CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 2: Create frontend Dockerfile**

Replace root `Dockerfile` with frontend-focused version:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source (will be overridden by volume mount in dev)
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile api/Dockerfile
git commit -m "docker: separate frontend and backend Dockerfiles"
```

---

## Task 2: Update docker-compose.yml for Full Stack

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add frontend service**

Replace the contents of `docker-compose.yml`:

```yaml
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    command: npm run dev

  backend:
    build:
      context: .
      dockerfile: api/Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
    env_file:
      - .env.local
    command: uvicorn api.index:app --host 0.0.0.0 --port 8000 --reload

  # Optional: local PostgreSQL
  # Uncomment if you want a local database instead of Supabase
  # postgres:
  #   image: postgres:16
  #   environment:
  #     POSTGRES_DB: cyc_survey
  #     POSTGRES_USER: postgres
  #     POSTGRES_PASSWORD: devpassword
  #   ports:
  #     - '5432:5432'
  #   volumes:
  #     - ./db_scripts/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
  #     - pgdata:/var/lib/postgresql/data

# volumes:
#   pgdata:
```

- [ ] **Step 2: Update .dockerignore**

Update `.dockerignore` to be more comprehensive:

```
node_modules
.next
.git
venv
.pytest_cache
graphify-out
*.pyc
__pycache__
.vercel
.env
.env.local
.DS_Store
```

- [ ] **Step 3: Test docker-compose**

Run: `docker-compose up --build`

Expected: Both frontend and backend containers start. Frontend at `localhost:3000`, backend at `localhost:8000`.

Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .dockerignore
git commit -m "docker: add frontend service to docker-compose"
```

---

## Task 3: Add Health Endpoints

**Files:**
- Create: `src/app/health/route.ts`
- Modify: `api/index.py`

- [ ] **Step 1: Create frontend health endpoint**

Create `src/app/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ status: 'ok', service: 'frontend' });
}
```

- [ ] **Step 2: Add backend health endpoint**

In `api/index.py`, add after the existing routes (near the end of the file, before or after other endpoints):

```python
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend"}
```

- [ ] **Step 3: Verify endpoints work**

If backend is running locally:
```bash
curl http://localhost:8000/health
```
Expected: `{"status":"ok","service":"backend"}`

For frontend, run `npm run dev` then:
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok","service":"frontend"}`

- [ ] **Step 4: Commit**

```bash
git add src/app/health/route.ts api/index.py
git commit -m "feat: add /health endpoints for frontend and backend"
```

---

## Task 4: Add Docker Build Check to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add Docker build job**

In `.github/workflows/ci.yml`, add a new job after the `e2e` job:

```yaml
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build frontend image
        run: docker build -t cyc-frontend .
      - name: Build backend image
        run: docker build -f api/Dockerfile -t cyc-backend .
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Docker build verification job"
```

---

## Task 5: Add Docker Scripts to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add docker scripts**

Add to `package.json` `scripts`:

```json
"docker:up": "docker-compose up",
"docker:down": "docker-compose down",
"docker:build": "docker-compose up --build"
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add docker convenience scripts to package.json"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
venv/bin/python -m pytest tests/unit/ -v
```

Expected: All tests pass.

- [ ] **Step 2: Verify Docker build**

```bash
docker-compose up --build -d
sleep 10
curl http://localhost:3000/health
curl http://localhost:8000/health
docker-compose down
```

Expected: Both return `{"status":"ok",...}`.

- [ ] **Step 3: Commit final verification**

```bash
git commit --allow-empty -m "chore: Phase 4 Docker & Deployment complete"
```

---

## Self-Review

**1. Spec coverage:**
- [x] Frontend Dockerfile → Task 1
- [x] Backend Dockerfile → Task 1
- [x] docker-compose.yml with both services → Task 2
- [x] Health endpoints → Task 3
- [x] CI Docker build check → Task 4
- [x] Docker scripts → Task 5
- [x] Final verification → Task 6

**2. Placeholder scan:**
- [x] No "TBD", "TODO", "implement later"
- [x] All steps show exact commands
- [x] All file paths are exact

**3. Type consistency:**
- [x] Health endpoint responses consistent
- [x] Docker Compose service names consistent

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-01-docker-deployment-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints.

**Which approach?**
