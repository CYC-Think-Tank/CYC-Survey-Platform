# CYC Survey Platform

Multilingual survey platform for the Canadian Youth Cabinet — built with Next.js and FastAPI, deployed on Vercel with Supabase.

## Quick Start (Docker)

```bash
git clone https://github.com/CYC-Think-Tank/CYC-Survey-Platform.git
cd CYC-Survey-Platform

# Copy and fill in your .env.local with Supabase credentials
cp .env.example .env.local

# Start backend + database
docker compose up -d

# Start frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the API runs on port 8000.

## Quick Start (No Docker)

```bash
# Backend
pip install -r requirements.txt
uvicorn api.index:app --host 0.0.0.0 --port 8000

# Frontend
npm install
npm run dev
```

Requires Python 3.12+, Node 22+, and a PostgreSQL database (local or Supabase).

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (placeholder) |
| `ruff check api/` | Lint Python backend |

## CI/CD

GitHub Actions runs automatically on every PR and push to `main`:

- **Frontend**: ESLint > TypeScript check > Production build
- **Backend**: ruff (Python linter)

If any step fails, the PR shows a red X — fix it before merging.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python), Uvicorn
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini
- **Hosting**: Vercel
