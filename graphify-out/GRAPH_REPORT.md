# Graph Report - .  (2026-05-28)

## Corpus Check
- Corpus is ~49,083 words - fits in a single context window. You may not need a graph.

## Summary
- 568 nodes · 785 edges · 65 communities (47 shown, 18 thin omitted)
- Extraction: 93% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Pages & DB Schema|Admin Pages & DB Schema]]
- [[_COMMUNITY_Dashboard & Data APIs|Dashboard & Data APIs]]
- [[_COMMUNITY_Short Answer Validation|Short Answer Validation]]
- [[_COMMUNITY_Cron & Build Config|Cron & Build Config]]
- [[_COMMUNITY_Pydantic Models & Stats|Pydantic Models & Stats]]
- [[_COMMUNITY_Home & Layout|Home & Layout]]
- [[_COMMUNITY_Session & Response APIs|Session & Response APIs]]
- [[_COMMUNITY_AI Insights Endpoints|AI Insights Endpoints]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_PDF Translation Upload|PDF Translation Upload]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_DB Scripts & Python Env|DB Scripts & Python Env]]
- [[_COMMUNITY_PDF Translation Design|PDF Translation Design]]
- [[_COMMUNITY_AI Analysis Methods|AI Analysis Methods]]
- [[_COMMUNITY_Validation Design Doc|Validation Design Doc]]
- [[_COMMUNITY_RichTextEditor & Questions|RichTextEditor & Questions]]
- [[_COMMUNITY_Gemini & CICD|Gemini & CI/CD]]
- [[_COMMUNITY_Backend API Core|Backend API Core]]
- [[_COMMUNITY_Statistical Functions|Statistical Functions]]
- [[_COMMUNITY_Results & AI Components|Results & AI Components]]
- [[_COMMUNITY_Cron Reminders|Cron Reminders]]
- [[_COMMUNITY_Email & Reminder Config|Email & Reminder Config]]
- [[_COMMUNITY_Survey Lifecycle Endpoints|Survey Lifecycle Endpoints]]
- [[_COMMUNITY_Share Links|Share Links]]
- [[_COMMUNITY_File & Upload APIs|File & Upload APIs]]
- [[_COMMUNITY_Reference Files & Assets|Reference Files & Assets]]
- [[_COMMUNITY_Environment Variables|Environment Variables]]
- [[_COMMUNITY_Language & i18n|Language & i18n]]
- [[_COMMUNITY_Design Documents|Design Documents]]
- [[_COMMUNITY_Implementation Plans|Implementation Plans]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]

## God Nodes (most connected - your core abstractions)
1. `str` - 33 edges
2. `str` - 33 edges
3. `Short Answer Validation` - 17 edges
4. `compilerOptions` - 16 edges
5. `PDF Translation Upload` - 16 edges
6. `handle_ai_analysis()` - 15 edges
7. `useLanguage()` - 11 edges
8. `questions Table` - 11 edges
9. `Survey Taking Page (Multi-step)` - 11 edges
10. `Short Answer Validation & Description Field Implementation Plan` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Admin survey edit page` --conceptually_related_to--> `Admin Create Page`  [INFERRED]
  src/app/admin/edit/[id]/page.tsx → docs/superpowers/plans/2026-05-27-short-answer-validation.md
- `questions Table` --references--> `Question Types`  [EXTRACTED]
  db_scripts/schema.sql → docs/superpowers/plans/2026-01-26-pdf-translation-upload.md
- `Supabase Client (Backend)` --implements--> `Supabase Python SDK (supabase 2.30.0)`  [EXTRACTED]
  api/index.py → requirements.txt
- `List questions script` --calls--> `python-dotenv`  [EXTRACTED]
  list_questions.py → requirements.txt
- `List questions script` --calls--> `Supabase Python client`  [EXTRACTED]
  list_questions.py → requirements.txt

## Hyperedges (group relationships)
- **AI Analysis Suite (6 Plugins)** — api_ai_persuadability, api_ai_mood, api_ai_beliefs, api_ai_minority, api_ai_archetypes, api_ai_blindspots [EXTRACTED 1.00]
- **Survey Lifecycle (Create → Edit → Publish → Lock → Results → AI Analysis)** — api_create_survey, api_update_survey, api_toggle_survey_status, api_get_survey_results, api_handle_ai_analysis [INFERRED 0.90]

## Communities (65 total, 18 thin omitted)

### Community 0 - "Admin Pages & DB Schema"
Cohesion: 0.05
Nodes (62): Admin Create Page, Admin survey edit page, Admin Results Page, ai_analyses Table, answers Table, GET /api/cron/reminders Route, Custom Regex Validation, CYC Survey Platform (+54 more)

### Community 1 - "Dashboard & Data APIs"
Cohesion: 0.06
Nodes (57): AdminDashboard Component, AdminLayout Component, AdminLogin Component, POST /api/sessions/{id}/attention-failure, POST /api/surveys/{id}/check-status, POST /api/surveys/{id}/check-status, PATCH /api/sessions/{session_id}/complete, POST /api/surveys/{survey_id}/sessions (+49 more)

### Community 2 - "Short Answer Validation"
Cohesion: 0.05
Nodes (37): code:typescript ('Please enter exactly 3 characters in the format A1A (letter), code:typescript (const updateValidationType = (qId: string, type: string) => ), code:typescript (} else if (q.type === 'short_answer') {), code:typescript (} else if (q.type === 'short_answer') {), code:tsx ({/* Question Description (all types) */}), code:tsx ({/* Short Answer Validation Config */}), code:bash (git add src/app/admin/create/page.tsx), code:bash (git add src/app/admin/edit/[id]/page.tsx) (+29 more)

### Community 3 - "Cron & Build Config"
Cohesion: 0.06
Nodes (37): Cron reminders endpoint, author, description, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss (+29 more)

### Community 4 - "Pydantic Models & Stats"
Cohesion: 0.11
Nodes (30): AnswerCreate, AnswerUpsert, calculate_median(), calculate_mode(), calculate_quartiles(), calculate_std_dev(), check_survey_status(), CheckStatusRequest (+22 more)

### Community 5 - "Home & Layout"
Cohesion: 0.11
Nodes (17): inter, metadata, Home(), Language, LanguageContext, LanguageContextType, LanguageProvider(), translations (+9 more)

### Community 6 - "Session & Response APIs"
Cohesion: 0.09
Nodes (22): complete_session(), delete_share_link(), delete_single_response(), duplicate_survey(), get_share_links(), get_survey(), get_survey_results(), get_survey_translation() (+14 more)

### Community 7 - "AI Insights Endpoints"
Cohesion: 0.16
Nodes (22): AiInsightsTab Component, POST /api/surveys/{id}/ai-archetypes (Archetypes), POST /api/surveys/{id}/ai-beliefs (Belief Network), POST /api/surveys/{id}/ai-blindspots (Blind Spots), POST /api/surveys/{id}/ai-minority (Minority Insights), POST /api/surveys/{id}/ai-mood (Mood Heatmap), POST /api/surveys/{id}/ai-analysis (Persuadability), _base_context (AI Prompt Builder) (+14 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "PDF Translation Upload"
Cohesion: 0.11
Nodes (16): code:text (pdfplumber), code:bash (git add src/app/admin/edit/[id]/page.tsx && git commit -m "f), code:bash (git add -A && git commit -m "test: verify PDF translation up), code:bash (git add api/requirements.txt && git commit -m "chore: add pd), code:python (import pdfplumber), code:python (GEMINI_MODEL = "gemini-3.5-flash"), code:python (@app.post("/api/surveys/{survey_id}/translation/upload")), code:python (import httpx) (+8 more)

### Community 10 - "Frontend Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, html-react-parser, lucide-react, next, nodemailer, react, react-dom (+7 more)

### Community 11 - "DB Scripts & Python Env"
Cohesion: 0.27
Nodes (15): Database check script, Insert check script, python-dotenv, FastAPI framework, List questions script, List surveys script, Python dependencies, Seed 1000 responses (+7 more)

### Community 12 - "PDF Translation Design"
Cohesion: 0.13
Nodes (14): 1. Problem, 2.1 New API Endpoint, 2.2 Gemini Prompt Strategy, 2.3 Authentication, 2.4 Frontend Change (Admin Edit Page), 2. Architecture, 3. Error Handling, 4. Data Flow (+6 more)

### Community 13 - "AI Analysis Methods"
Cohesion: 0.27
Nodes (14): ai_archetypes(), ai_belief_network(), ai_blindspots(), ai_minority_insights(), ai_mood_heatmap(), ai_persuadability_analysis(), AIAnalysisRequest, _base_context() (+6 more)

### Community 14 - "Validation Design Doc"
Cohesion: 0.14
Nodes (13): Admin UI (Create/Edit), Background, code:jsonc ({), Data Model, Files to Modify, Goal, No database migration needed, `options` JSONB — new fields (+5 more)

### Community 15 - "RichTextEditor & Questions"
Cohesion: 0.18
Nodes (8): RichTextEditor(), RichTextEditorProps, QuestionDraft, QuestionType, VALIDATION_PRESETS, QuestionDraft, QuestionType, VALIDATION_PRESETS

### Community 16 - "Gemini & CI/CD"
Cohesion: 0.29
Nodes (10): _call_gemini (Gemini API Wrapper), CYC Survey Platform API (FastAPI App), GET /api/test-gemini, POST /api/surveys/{survey_id}/translation/upload (PDF Translation), CI/CD & Docker Design Document, Docker Compose Dev Stack, Google Gemini 2.5 Flash (AI Model), GitHub Actions CI Pipeline (+2 more)

### Community 17 - "Backend API Core"
Cohesion: 0.25
Nodes (9): _call_gemini(), get_survey_responses_paginated(), get_surveys(), bool, Get surveys and their response counts, Shared helper: call Gemini and parse the JSON response., Fetch individual responses with pagination., bool (+1 more)

### Community 18 - "Statistical Functions"
Cohesion: 0.25
Nodes (9): calculate_median (Backend Stats), calculate_mode (Backend Stats), calculate_quartiles (Backend Stats), calculate_std_dev (Backend Stats), find_outliers (Backend Stats), GET /api/surveys/{survey_id}/responses/paginated, GET /api/surveys/{survey_id}/results, GET /api/surveys/{survey_id}/summary (+1 more)

### Community 19 - "Results & AI Components"
Cohesion: 0.25
Nodes (4): AiModuleKey, Answer, Question, Response

### Community 20 - "Cron Reminders"
Cohesion: 0.33
Nodes (6): Tests for short_answer validation logic without requiring a running server., Replicate the validation logic that should happen client-side and server-side., run_tests(), validate_postal_code_prefix(), bool, str

### Community 21 - "Email & Reminder Config"
Cohesion: 0.29
Nodes (7): GRAPH_REPORT.md, graphify explain CLI, graphify-out/, graphify path CLI, graphify query CLI, graphify update CLI, Knowledge Graph (graphify)

### Community 22 - "Survey Lifecycle Endpoints"
Cohesion: 0.43
Nodes (7): public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, Next.js Framework, Vercel Platform, create-next-app Scaffold

### Community 23 - "Share Links"
Cohesion: 0.33
Nodes (5): buildCommand, crons, framework, installCommand, rewrites

### Community 24 - "File & Upload APIs"
Cohesion: 0.40
Nodes (5): create_survey(), Create a new survey and its questions, Update an existing survey and its questions. Fails if the survey has ever been p, SurveyCreate, update_survey()

### Community 25 - "Reference Files & Assets"
Cohesion: 0.40
Nodes (5): Upload a PDF containing translated survey questions and auto-populate translatio, Upload a file to Supabase Storage and return the public URL., upload_file(), upload_translation_pdf(), UploadFile

### Community 26 - "Environment Variables"
Cohesion: 0.50
Nodes (4): CYC_Logo.png, logo.png, page.tsx (Homepage), HeaderFooter.tsx

### Community 27 - "Language & i18n"
Cohesion: 0.67
Nodes (3): Manually update the translated questions JSON., update_survey_translation(), Request

### Community 28 - "Design Documents"
Cohesion: 0.67
Nodes (3): Graphify OpenCode plugin, OpenCode configuration, OpenCode plugin package

## Knowledge Gaps
- **207 isolated node(s):** `buildCommand`, `installCommand`, `framework`, `rewrites`, `crons` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pdfplumber` connect `Admin Pages & DB Schema` to `Pydantic Models & Stats`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `Vercel deployment config` connect `Cron & Build Config` to `Pydantic Models & Stats`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `buildCommand`, `installCommand`, `framework` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Pages & DB Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.053763440860215055 - nodes in this community are weakly interconnected._
- **Should `Dashboard & Data APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.06140350877192982 - nodes in this community are weakly interconnected._
- **Should `Short Answer Validation` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Cron & Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06072874493927125 - nodes in this community are weakly interconnected._