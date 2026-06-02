# Graph Report - CYC-Survey-Platform  (2026-06-02)

## Corpus Check
- 99 files · ~52,640 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 939 nodes · 1341 edges · 96 communities (64 shown, 32 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c1f0715`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]

## God Nodes (most connected - your core abstractions)
1. `str` - 33 edges
2. `str` - 33 edges
3. `handle_ai_analysis()` - 18 edges
4. `Short Answer Validation` - 17 edges
5. `compilerOptions` - 16 edges
6. `PDF Translation Upload` - 16 edges
7. `handle_ai_analysis()` - 15 edges
8. `get_survey_summary()` - 15 edges
9. `scripts` - 14 edges
10. `calculate_median()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `FastAPI CYC Survey API` --conceptually_related_to--> `CYC Survey Platform`  [INFERRED]
  api/index.py → README.md
- `Ruff Pre-commit Configuration` --semantically_similar_to--> `CI Backend Job`  [INFERRED] [semantically similar]
  .pre-commit-config.yaml → .github/workflows/ci.yml
- `Admin survey edit page` --conceptually_related_to--> `Admin Create Page`  [INFERRED]
  src/app/admin/edit/[id]/page.tsx → docs/superpowers/plans/2026-05-27-short-answer-validation.md
- `questions Table` --references--> `Question Types`  [EXTRACTED]
  db_scripts/schema.sql → docs/superpowers/plans/2026-01-26-pdf-translation-upload.md
- `FastAPI CYC Survey API` --shares_data_with--> `Docker Compose Dev Stack`  [EXTRACTED]
  api/index.py → docker-compose.yml

## Hyperedges (group relationships)
- **CYC Survey Platform Tech Stack** — readme_nextjs, readme_fastapi, readme_supabase, readme_gemini, readme_vercel [EXTRACTED 1.00]
- **Docker Compose Services** — docker_compose_frontend, docker_compose_backend, docker_compose_postgres [EXTRACTED 1.00]
- **CI Pipeline Jobs** — ci_frontend, ci_backend, ci_docker [EXTRACTED 1.00]

## Communities (96 total, 32 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (62): Admin Create Page, Admin survey edit page, Admin Results Page, ai_analyses Table, answers Table, GET /api/cron/reminders Route, Custom Regex Validation, CYC Survey Platform (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (57): AdminDashboard Component, AdminLayout Component, AdminLogin Component, POST /api/sessions/{id}/attention-failure, POST /api/surveys/{id}/check-status, POST /api/surveys/{id}/check-status, PATCH /api/sessions/{session_id}/complete, POST /api/surveys/{survey_id}/sessions (+49 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (33): inter, metadata, Home(), Survey, TiltCardProps, Language, LanguageContext, LanguageContextType (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (37): code:typescript ('Please enter exactly 3 characters in the format A1A (letter), code:typescript (const updateValidationType = (qId: string, type: string) => ), code:typescript (} else if (q.type === 'short_answer') {), code:typescript (} else if (q.type === 'short_answer') {), code:tsx ({/* Question Description (all types) */}), code:tsx ({/* Short Answer Validation Config */}), code:bash (git add src/app/admin/create/page.tsx), code:bash (git add src/app/admin/edit/[id]/page.tsx) (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (38): Any, Gather Survey Data for AI, calculate_median(), calculate_mode(), calculate_quartiles(), calculate_std_dev(), find_outliers(), get_survey_summary() (+30 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (23): AnswerCreate, AnswerUpsert, check_survey_status(), CheckStatusRequest, create_session(), create_share_link(), Question, QuestionCreate (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (40): AiInsightsTab Component, POST /api/surveys/{id}/ai-archetypes (Archetypes), POST /api/surveys/{id}/ai-beliefs (Belief Network), POST /api/surveys/{id}/ai-blindspots (Blind Spots), POST /api/surveys/{id}/ai-minority (Minority Insights), POST /api/surveys/{id}/ai-mood (Mood Heatmap), POST /api/surveys/{id}/ai-analysis (Persuadability), _base_context (AI Prompt Builder) (+32 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (24): AiMeta, AiModuleData, AiModuleKey, AmplifiedConcern, Archetype, BeliefCluster, BlindSpot, DemographicSegment (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (7): cleanup_surveys(), Context manager that tracks created survey IDs and deletes them in teardown., Integration test: Logic Gating Persistence through Survey Activation/Publish. Re, Create a survey with logic gates and clean it up after., TestLogicGatingPersistence, TestSurveyCrud, TestSurveySubmission

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (27): CI Backend Job, CI Docker Build Job, CI E2E Tests Job, CI Frontend Job, CodeQL Security Analysis, CodeQL JavaScript Analysis, CodeQL Python Analysis, Dependabot NPM Updates (+19 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (20): complete_session(), delete_all_responses(), delete_share_link(), delete_survey(), get_share_links(), get_survey(), get_survey_results(), get_user_profile_data() (+12 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (15): RichTextEditor(), RichTextEditorProps, QuestionDraft, QuestionType, VALIDATION_PRESETS, ApiQuestion, ApiTranslationQuestion, OptionsPayload (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (16): code:text (pdfplumber), code:bash (git add src/app/admin/edit/[id]/page.tsx && git commit -m "f), code:bash (git add -A && git commit -m "test: verify PDF translation up), code:bash (git add api/requirements.txt && git commit -m "chore: add pd), code:python (import pdfplumber), code:python (GEMINI_MODEL = "gemini-3.5-flash"), code:python (@app.post("/api/surveys/{survey_id}/translation/upload")), code:python (import httpx) (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (8): create_survey(), duplicate_survey(), Logic Gate ID Remapping, Create a new survey and its questions, Duplicate an existing survey and its questions, Update an existing survey and its questions. Fails if the survey has ever been p, SurveyCreate, update_survey()

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, husky, jsdom, lint-staged, @playwright/test, prettier, @tailwindcss/postcss (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (13): author, description, eslint-config-next, keywords, license, main, name, private (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (14): 1. Problem, 2.1 New API Endpoint, 2.2 Gemini Prompt Strategy, 2.3 Authentication, 2.4 Frontend Change (Admin Edit Page), 2. Architecture, 3. Error Handling, 4. Data Flow (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (33): Upload a file to Supabase Storage and return the public URL., upload_file(), ShareLinkCreate, str, str, Database check script, Insert check script, python-dotenv (+25 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, html-react-parser, lucide-react, next, nodemailer, react, react-dom (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (13): Admin UI (Create/Edit), Background, code:jsonc ({), Data Model, Files to Modify, Goal, No database migration needed, `options` JSONB — new fields (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (14): scripts, build, dev, docker:build, docker:down, docker:up, format, format:check (+6 more)

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (15): AI Analysis Suite, ai_archetypes(), ai_belief_network(), ai_blindspots(), ai_minority_insights(), ai_mood_heatmap(), ai_persuadability_analysis(), AIAnalysisRequest (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (6): Tests for short_answer validation logic without requiring a running server., Replicate the validation logic that should happen client-side and server-side., TestShortAnswerValidation, validate_postal_code_prefix(), bool, str

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (11): Create Survey Admin Page, Edit Survey Admin Page, Attention Check Failure Tracking, Published Survey Editing Lock, Translation CRUD Endpoints, Header with Language Switcher, Survey Respondent Page, Attention Check Injection (+3 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (12): _call_gemini(), get_raffle_email(), _get_random_email_position(), get_survey_responses_paginated(), get_surveys(), bool, int, Get surveys and their response counts (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (28): AnswerUpsert, AnswerCreate, AnswerUpsert, CheckStatusRequest, Question, QuestionCreate, ResponseSubmission, SessionCreate (+20 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (22): AIAnalysisRequest, AIAnalysisRequest, str, bool, int, str, ai_archetypes(), ai_belief_network() (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (5): ShareLink, Survey, mockPush, mockSurveys, newSurveyLink

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (7): GRAPH_REPORT.md, graphify explain CLI, graphify-out/, graphify path CLI, graphify query CLI, graphify update CLI, Knowledge Graph (graphify)

### Community 30 - "Community 30"
Cohesion: 0.43
Nodes (7): public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, Next.js Framework, Vercel Platform, create-next-app Scaffold

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): ActiveSurvey, CompletedSession, GET(), IncompleteSession, request

### Community 32 - "Community 32"
Cohesion: 0.17
Nodes (20): SurveyCreate, SurveyDetail, SurveyList, bool, str, create_survey(), delete_survey(), duplicate_survey() (+12 more)

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (5): buildCommand, crons, framework, installCommand, rewrites

### Community 36 - "Community 36"
Cohesion: 0.40
Nodes (6): Cron reminders endpoint, Next.js configuration, Next.js framework, Survey API endpoints, TypeScript configuration, Vercel deployment config

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): *.{js,jsx}, *.{json,md,yml,yaml,css,scss}, *.{ts,tsx}

### Community 39 - "Community 39"
Cohesion: 0.50
Nodes (4): CYC_Logo.png, logo.png, page.tsx (Homepage), HeaderFooter.tsx

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (6): Call Gemini API, FastAPI CYC Survey API, Toggle a survey's active status., Upload a PDF containing translated survey questions and auto-populate translatio, toggle_survey_status(), upload_translation_pdf()

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (3): tailwindcss, PostCSS configuration, Tailwind CSS

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (12): Admin Page, Backend Module Layout, CI/CD, code:bash (cp .env.example .env.local), code:bash (git clone https://github.com/CYC-Think-Tank/CYC-Survey-Platf), code:bash (# Backend), CYC Survey Platform, Environment Variables (+4 more)

## Ambiguous Edges - Review These
- `Backend Docker Service` → `PostgreSQL Docker Service`  [AMBIGUOUS]
  docker-compose.yml · relation: conceptually_related_to

## Knowledge Gaps
- **305 isolated node(s):** `*.{ts,tsx}`, `*.{js,jsx}`, `*.{json,md,yml,yaml,css,scss}`, `buildCommand`, `installCommand` (+300 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Backend Docker Service` and `PostgreSQL Docker Service`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `FastAPI framework` connect `Community 18` to `Community 32`, `Community 4`, `Community 5`, `Community 36`, `Community 26`, `Community 27`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `pdfplumber` connect `Community 0` to `Community 18`, `Community 5`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `FastAPI CYC Survey API` connect `Community 40` to `Community 9`, `Community 14`, `Community 6`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `*.{ts,tsx}`, `*.{js,jsx}`, `*.{json,md,yml,yaml,css,scss}` to the rest of the system?**
  _374 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053763440860215055 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06140350877192982 - nodes in this community are weakly interconnected._