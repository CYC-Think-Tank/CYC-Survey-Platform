# CYC Survey Platform

Multilingual survey platform for the Canadian Youth Cabinet — built with Next.js and FastAPI, deployed on Vercel with Supabase.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable                                 | Description                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`               | Supabase project URL (browser, from Supabase dashboard)                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`          | Supabase anon/publishable key (browser)                                                |
| `SUPABASE_URL`                           | Supabase project URL (server, same as above)                                           |
| `SUPABASE_KEY`                           | Supabase service_role key (server, **never exposed to client**)                        |
| `NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL_DOMAIN` | Allowed email domain for admin Supabase Auth sign-in/sign-up, e.g. `thecyc.org`        |
| `ALLOWED_ADMIN_EMAIL_DOMAIN`             | Server-side allowed admin email domain. Keep it aligned with the public value.         |
| `NEXT_PUBLIC_SITE_URL`                   | Public URL of your deployment (e.g. `https://example.vercel.app`)                      |
| `GMAIL_USER`                             | Gmail address for sending survey reminder emails                                       |
| `GMAIL_APP_PASSWORD`                     | Gmail app password (enable 2FA → App Passwords in Google Account)                      |
| `GOOGLE_AI_KEY`                          | Google Gemini API key for AI features (translation, insights)                          |
| `CRON_SECRET`                            | Shared secret for securing the `/api/cron/reminders` endpoint (required in production) |

## Quick Start (Docker)

```bash
git clone https://github.com/CYC-Think-Tank/CYC-Survey-Platform.git
cd CYC-Survey-Platform

# Copy and fill in your .env.local
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

| Command           | What it does             |
| ----------------- | ------------------------ |
| `npm run dev`     | Start Next.js dev server |
| `npm run build`   | Production build         |
| `npm run lint`    | Run ESLint               |
| `npm test`        | Run tests (placeholder)  |
| `ruff check api/` | Lint Python backend      |

## CI/CD

GitHub Actions runs automatically on every PR and push to `main`:

- **Frontend**: ESLint > TypeScript check > Production build
- **Backend**: ruff (Python linter)

If any step fails, the PR shows a red X — fix it before merging.

## Admin Page

The admin panel is not linked from the main UI — access it directly at:

**[https://thinktank.thecyc.org/admin](https://thinktank.thecyc.org/admin)**

Admin access uses Supabase Auth. Users must sign in with an email from the configured allowed
domain and must belong to a team.

Teams have two roles:

- `team_leader`: can create, edit, view, and delete team surveys, and approve or reject team join requests.
- `team_member`: can create, edit, and view team surveys, and request to join teams.

After running the admin/team migration locally, create at least one team and leader membership in
your cloned/local Supabase database. Example SQL, using the authenticated user's UUID:

```sql
insert into public.teams (name, created_by)
values ('CYC Admin', 'USER_UUID')
returning id;

insert into public.team_members (team_id, user_id, role)
values ('TEAM_UUID', 'USER_UUID', 'team_leader');

-- Assign existing cloned surveys to that team so they appear in admin.
update public.surveys
set team_id = 'TEAM_UUID',
    owner_user_id = coalesce(owner_user_id, 'USER_UUID')
where team_id is null;
```

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: FastAPI (Python), Uvicorn
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini
- **Hosting**: Vercel

## Backend Module Layout

The deployable FastAPI entrypoint remains `api.index:app` for Vercel, Docker, and local `uvicorn api.index:app` workflows. Backend internals are split by responsibility:

- `api/models.py` — shared Pydantic request and response models
- `api/dependencies.py` — environment loading and shared Supabase client
- `api/routes/` — domain routers for surveys, translations/uploads, sessions/responses, results/admin, share links, and AI insights
- `api/services/` — reusable backend service helpers, including AI analysis orchestration
