# Phase 4: Docker & Deployment Design

> **Scope:** Issue #17, Section 5 — "Docker Improvements" + Section 6 — "Automated Deployment". Builds on Phases 1-3.
> **Approach:** Docker for local development only. Stay on Vercel for production.

**Goal:** Add Docker support for local development (so teammates can run the full stack with one command) and set up automatic preview deployments on PRs.

---

## 1. Context & Motivation

The app currently runs on Vercel (frontend + API routes via `vercel.json` rewrites). This works well for production but makes local development tricky — teammates need Node.js, Python, and all dependencies installed correctly. Docker solves this by packaging everything into containers that run identically on any machine.

We stay on Vercel for production because:
- It's free for student projects
- Handles CDN, SSL, and serverless scaling automatically
- Already configured with `vercel.json`

---

## 2. Local Development with Docker

### 2.1 Architecture

```yaml
docker-compose up
```

Starts 2-3 containers:
1. **frontend** — Next.js dev server on `localhost:3000` (with hot reload)
2. **backend** — Python FastAPI on `localhost:8000` (with auto-reload)
3. **db** (optional) — PostgreSQL for local Supabase alternative

### 2.2 Files to Create

| File | Purpose |
|------|---------|
| `Dockerfile` | Build frontend container (Node.js base) |
| `api/Dockerfile` | Build backend container (Python base) |
| `docker-compose.yml` | Orchestrate frontend + backend + optional db |
| `.dockerignore` | Exclude node_modules, .next, venv, etc. |

### 2.3 Frontend Dockerfile

```dockerfile
# Multi-stage: deps → dev
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source (mount in dev for hot reload)
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### 2.4 Backend Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source (mount in dev for auto-reload)
COPY . .

EXPOSE 8000
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### 2.5 docker-compose.yml

```yaml
version: '3.8'
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
    command: uvicorn api.index:app --host 0.0.0.0 --port 8000 --reload
```

### 2.6 .dockerignore

```
node_modules
.next
.git
venv
.pytest_cache
graphify-out
*.pyc
__pycache__
```

---

## 3. CI Docker Verification

Add a CI job that builds the Docker images to catch Dockerfile breakage:

```yaml
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build frontend image
        run: docker build -t frontend-test .
      - name: Build backend image
        run: docker build -f api/Dockerfile -t backend-test .
```

This ensures Dockerfiles don't break without actually pushing images anywhere.

---

## 4. Deployment Automation

### 4.1 Vercel Git Integration (Already Active)

Vercel already deploys on push to `main` and creates preview deployments for PRs via the GitHub integration. No changes needed.

### 4.2 Health Endpoints

Add simple `/health` endpoints so monitoring tools can verify the app is alive:

**Frontend:** `src/app/health/route.ts`
```typescript
import { NextResponse } from 'next/server';
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'frontend' });
}
```

**Backend:** Add to `api/index.py`
```python
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend"}
```

---

## 5. Out of Scope

- Moving off Vercel
- Production Docker deployment
- Kubernetes / complex orchestration
- Load balancing / horizontal scaling
- Alembic migrations (Phase 5)

---

## 6. Acceptance Criteria

- [ ] `docker-compose up` starts frontend + backend successfully
- [ ] Frontend reachable at `localhost:3000`
- [ ] Backend API reachable at `localhost:8000`
- [ ] Changes to source code auto-reload in Docker
- [ ] CI verifies Docker builds don't break
- [ ] Health endpoints return 200 OK

---

*Design approved: 2026-06-01*
