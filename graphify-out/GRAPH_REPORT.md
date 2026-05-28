# Graph Report - CYC-Survey-Platform  (2026-05-28)

## Corpus Check
- 48 files · ~46,983 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 519 nodes · 660 edges · 75 communities (47 shown, 28 thin omitted)
- Extraction: 93% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1a3dda9`
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
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]

## God Nodes (most connected - your core abstractions)
1. `str` - 33 edges
2. `Short Answer Validation` - 17 edges
3. `compilerOptions` - 16 edges
4. `PDF Translation Upload` - 16 edges
5. `handle_ai_analysis()` - 13 edges
6. `useLanguage()` - 11 edges
7. `questions Table` - 11 edges
8. `Short Answer Validation & Description Field Implementation Plan` - 10 edges
9. `Task 3: Add description field and validation config to admin create page` - 10 edges
10. `Task 5: Update respondent survey page with description display and validation` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Admin Create Page` --conceptually_related_to--> `Admin survey edit page`  [INFERRED]
  docs/superpowers/plans/2026-05-27-short-answer-validation.md → src/app/admin/edit/[id]/page.tsx
- `options JSONB` --references--> `questions Table`  [EXTRACTED]
  docs/superpowers/specs/2026-05-27-short-answer-validation-design.md → db_scripts/schema.sql
- `POST /api/surveys/{survey_id}/translation/upload` --references--> `questions Table`  [EXTRACTED]
  docs/superpowers/plans/2026-01-26-pdf-translation-upload.md → db_scripts/schema.sql
- `Question Mapping by Position Index` --references--> `questions Table`  [EXTRACTED]
  docs/superpowers/plans/2026-01-26-pdf-translation-upload.md → db_scripts/schema.sql
- `questions Table` --references--> `Question Types`  [EXTRACTED]
  db_scripts/schema.sql → docs/superpowers/plans/2026-01-26-pdf-translation-upload.md

## Communities (75 total, 28 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (16): AnswerCreate, AnswerUpsert, check_survey_status(), CheckStatusRequest, create_session(), Question, QuestionCreate, Check if the given email has already submitted the survey. (+8 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (48): Admin Create Page, Admin survey edit page, Admin Results Page, ai_analyses Table, Custom Regex Validation, CYC Survey Platform, Client + Server Validation, Email Validation (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (35): Cron reminders endpoint, author, description, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (36): AdminDashboard Component, AdminLayout Component, AdminLogin Component, POST /api/sessions/{id}/attention-failure, POST /api/surveys/{id}/check-status, PATCH /api/sessions/{id}/complete, POST /api/surveys/{id}/sessions, POST /api/surveys (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (17): inter, metadata, Home(), Language, LanguageContext, LanguageContextType, LanguageProvider(), translations (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (17): AiInsightsTab Component, POST /api/surveys/{id}/ai-archetypes, POST /api/surveys/{id}/ai-beliefs, POST /api/surveys/{id}/ai-blindspots, POST /api/surveys/{id}/ai-minority, POST /api/surveys/{id}/ai-mood, POST /api/surveys/{id}/ai-analysis, DELETE /api/surveys/{id}/responses (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, html-react-parser, lucide-react, next, nodemailer, react, react-dom (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.27
Nodes (15): Database check script, Insert check script, python-dotenv, FastAPI framework, List questions script, List surveys script, Python dependencies, Seed 1000 responses (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (14): answers Table, GET /api/cron/reminders Route, Database Schema (SQL), FastAPI Application, Pydantic Models (Question, SurveyList, etc.), question_type ENUM, Question Types, questions Table (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (8): RichTextEditor(), RichTextEditorProps, QuestionDraft, QuestionType, VALIDATION_PRESETS, QuestionDraft, QuestionType, VALIDATION_PRESETS

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (4): AiModuleKey, Answer, Question, Response

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (7): GRAPH_REPORT.md, graphify explain CLI, graphify-out/, graphify path CLI, graphify query CLI, graphify update CLI, Knowledge Graph (graphify)

### Community 13 - "Community 13"
Cohesion: 0.43
Nodes (7): public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, Next.js Framework, Vercel Platform, create-next-app Scaffold

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (5): buildCommand, crons, framework, installCommand, rewrites

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (6): Tests for short_answer validation logic without requiring a running server., Replicate the validation logic that should happen client-side and server-side., run_tests(), validate_postal_code_prefix(), bool, str

### Community 16 - "Community 16"
Cohesion: 0.50
Nodes (4): CYC_Logo.png, logo.png, page.tsx (Homepage), HeaderFooter.tsx

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (3): Graphify OpenCode plugin, OpenCode configuration, OpenCode plugin package

### Community 49 - "Community 49"
Cohesion: 0.05
Nodes (37): code:typescript ('Please enter exactly 3 characters in the format A1A (letter), code:typescript (const updateValidationType = (qId: string, type: string) => ), code:typescript (} else if (q.type === 'short_answer') {), code:typescript (} else if (q.type === 'short_answer') {), code:tsx ({/* Question Description (all types) */}), code:tsx ({/* Short Answer Validation Config */}), code:bash (git add src/app/admin/create/page.tsx), code:bash (git add src/app/admin/edit/[id]/page.tsx) (+29 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (16): code:text (pdfplumber), code:bash (git add src/app/admin/edit/[id]/page.tsx && git commit -m "f), code:bash (git add -A && git commit -m "test: verify PDF translation up), code:bash (git add api/requirements.txt && git commit -m "chore: add pd), code:python (import pdfplumber), code:python (GEMINI_MODEL = "gemini-3.5-flash"), code:python (@app.post("/api/surveys/{survey_id}/translation/upload")), code:python (import httpx) (+8 more)

### Community 51 - "Community 51"
Cohesion: 0.13
Nodes (14): 1. Problem, 2.1 New API Endpoint, 2.2 Gemini Prompt Strategy, 2.3 Authentication, 2.4 Frontend Change (Admin Edit Page), 2. Architecture, 3. Error Handling, 4. Data Flow (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.27
Nodes (14): ai_archetypes(), ai_belief_network(), ai_blindspots(), ai_minority_insights(), ai_mood_heatmap(), ai_persuadability_analysis(), AIAnalysisRequest, _gather_survey_data() (+6 more)

### Community 53 - "Community 53"
Cohesion: 0.14
Nodes (13): Admin UI (Create/Edit), Background, code:jsonc ({), Data Model, Files to Modify, Goal, No database migration needed, `options` JSONB — new fields (+5 more)

### Community 54 - "Community 54"
Cohesion: 0.24
Nodes (12): calculate_median(), calculate_mode(), calculate_quartiles(), calculate_std_dev(), delete_share_link(), find_outliers(), get_survey_summary(), Quick test endpoint to verify Gemini API connectivity. (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (8): _call_gemini(), get_survey_responses_paginated(), get_surveys(), bool, Get surveys and their response counts, Shared helper: call Gemini and parse the JSON response., Fetch individual responses with pagination., int

### Community 56 - "Community 56"
Cohesion: 0.40
Nodes (5): create_survey(), Create a new survey and its questions, Update an existing survey and its questions. Fails if the survey has ever been p, SurveyCreate, update_survey()

### Community 57 - "Community 57"
Cohesion: 0.40
Nodes (5): Upload a PDF containing translated survey questions and auto-populate translatio, Upload a file to Supabase Storage and return the public URL., upload_file(), upload_translation_pdf(), UploadFile

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (3): create_share_link(), Generate a unique share link code for a survey., ShareLinkCreate

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (3): Manually update the translated questions JSON., update_survey_translation(), Request

## Knowledge Gaps
- **193 isolated node(s):** `buildCommand`, `installCommand`, `framework`, `rewrites`, `crons` (+188 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pdfplumber` connect `Community 1` to `Community 54`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `Short Answer Validation` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `buildCommand`, `installCommand`, `framework` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06717687074829932 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06456456456456457 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._