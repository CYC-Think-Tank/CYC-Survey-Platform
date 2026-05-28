# Graph Report - .  (2026-05-28)

## Corpus Check
- 64 files · ~50,961 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 594 nodes · 827 edges · 70 communities (52 shown, 18 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Admin Endpoints|API Admin Endpoints]]
- [[_COMMUNITY_Admin Pages & Data|Admin Pages & Data]]
- [[_COMMUNITY_Short Answer Validation Plan|Short Answer Validation Plan]]
- [[_COMMUNITY_Survey Data API|Survey Data API]]
- [[_COMMUNITY_App Layout & i18n|App Layout & i18n]]
- [[_COMMUNITY_AI Analysis API|AI Analysis API]]
- [[_COMMUNITY_Survey CRUD Endpoints|Survey CRUD Endpoints]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_PDF Translation Plan|PDF Translation Plan]]
- [[_COMMUNITY_Python Scripts & Utils|Python Scripts & Utils]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_PDF Translation Design|PDF Translation Design]]
- [[_COMMUNITY_Validation Design Spec|Validation Design Spec]]
- [[_COMMUNITY_AI Analysis Suite|AI Analysis Suite]]
- [[_COMMUNITY_Survey Editor Components|Survey Editor Components]]
- [[_COMMUNITY_Core Platform Pages|Core Platform Pages]]
- [[_COMMUNITY_Survey Mutation API|Survey Mutation API]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_Infrastructure & CICD|Infrastructure & CI/CD]]
- [[_COMMUNITY_Paginated API & Types|Paginated API & Types]]
- [[_COMMUNITY_Logic Gating Tests|Logic Gating Tests]]
- [[_COMMUNITY_Results & Insights UI|Results & Insights UI]]
- [[_COMMUNITY_Graphify Knowledge Graph|Graphify Knowledge Graph]]
- [[_COMMUNITY_Public Assets & Tech|Public Assets & Tech]]
- [[_COMMUNITY_Validation Test Suite|Validation Test Suite]]
- [[_COMMUNITY_Gemini & File Upload|Gemini & File Upload]]
- [[_COMMUNITY_Package Scripts|Package Scripts]]
- [[_COMMUNITY_Vercel Configuration|Vercel Configuration]]
- [[_COMMUNITY_Next.js Config & Cron|Next.js Config & Cron]]
- [[_COMMUNITY_Brand Assets & Header|Brand Assets & Header]]
- [[_COMMUNITY_Translation Update API|Translation Update API]]
- [[_COMMUNITY_Graphify Plugin Config|Graphify Plugin Config]]
- [[_COMMUNITY_OpenCode Configuration|OpenCode Configuration]]
- [[_COMMUNITY_OpenCode Package|OpenCode Package]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
- [[_COMMUNITY_VS Code Settings|VS Code Settings]]
- [[_COMMUNITY_AGENTS Graphify Docs|AGENTS Graphify Docs]]
- [[_COMMUNITY_User Profile API|User Profile API]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_ESLint Config File|ESLint Config File]]
- [[_COMMUNITY_Short Answer Validation|Short Answer Validation]]
- [[_COMMUNITY_User Profile Data|User Profile Data]]
- [[_COMMUNITY_Update Step API|Update Step API]]
- [[_COMMUNITY_VS Code Settings|VS Code Settings]]
- [[_COMMUNITY_CYC Logo Icon|CYC Logo Icon]]
- [[_COMMUNITY_CYC Favicon|CYC Favicon]]
- [[_COMMUNITY_File Icon SVG|File Icon SVG]]
- [[_COMMUNITY_Get User Profile|Get User Profile]]
- [[_COMMUNITY_RichTextRenderer|RichTextRenderer]]

## God Nodes (most connected - your core abstractions)
1. `str` - 33 edges
2. `str` - 33 edges
3. `handle_ai_analysis()` - 18 edges
4. `Short Answer Validation` - 17 edges
5. `compilerOptions` - 16 edges
6. `PDF Translation Upload` - 16 edges
7. `useLanguage()` - 11 edges
8. `questions Table` - 11 edges
9. `Survey Taking Page (Multi-step)` - 11 edges
10. `get_survey_summary()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `FastAPI CYC Survey API` --conceptually_related_to--> `CYC Survey Platform`  [INFERRED]
  api/index.py → README.md
- `Admin survey edit page` --conceptually_related_to--> `Admin Create Page`  [INFERRED]
  src/app/admin/edit/[id]/page.tsx → docs/superpowers/plans/2026-05-27-short-answer-validation.md
- `questions Table` --references--> `Question Types`  [EXTRACTED]
  db_scripts/schema.sql → docs/superpowers/plans/2026-01-26-pdf-translation-upload.md
- `Supabase Client (Backend)` --implements--> `Supabase Python SDK (supabase 2.30.0)`  [EXTRACTED]
  api/index.py → requirements.txt
- `Create Survey Admin Page` --implements--> `Multilingual Support (en/fr/zh)`  [INFERRED]
  src/app/admin/create/page.tsx → README.md

## Hyperedges (group relationships)
- **Logic Gating End-to-End Flow** — api_index_create_survey, api_index_update_survey, api_index_duplicate_survey, api_index_logic_gate_id_remapping, admin_create_CreateSurvey, admin_edit_EditSurvey, survey_page_SurveyPage, survey_page_getNextVisibleStep, test_logic_gating_persistence_suite [INFERRED 0.90]
- **AI Analysis Pipeline** — api_index__gather_survey_data, api_index__call_gemini, api_index_handle_ai_analysis, api_index_ai_analysis_suite, api_index_upload_translation_pdf [EXTRACTED 1.00]

## Communities (70 total, 18 thin omitted)

### Community 0 - "API Admin Endpoints"
Cohesion: 0.05
Nodes (66): AdminDashboard Component, AdminLayout Component, AdminLogin Component, POST /api/sessions/{id}/attention-failure, POST /api/surveys/{id}/check-status, POST /api/surveys/{id}/check-status, PATCH /api/sessions/{session_id}/complete, POST /api/surveys/{survey_id}/sessions (+58 more)

### Community 1 - "Admin Pages & Data"
Cohesion: 0.06
Nodes (60): Admin Create Page, Admin survey edit page, Admin Results Page, ai_analyses Table, answers Table, GET /api/cron/reminders Route, Custom Regex Validation, CYC Survey Platform (+52 more)

### Community 2 - "Short Answer Validation Plan"
Cohesion: 0.05
Nodes (37): code:typescript ('Please enter exactly 3 characters in the format A1A (letter), code:typescript (const updateValidationType = (qId: string, type: string) => ), code:typescript (} else if (q.type === 'short_answer') {), code:typescript (} else if (q.type === 'short_answer') {), code:tsx ({/* Question Description (all types) */}), code:tsx ({/* Short Answer Validation Config */}), code:bash (git add src/app/admin/create/page.tsx), code:bash (git add src/app/admin/edit/[id]/page.tsx) (+29 more)

### Community 3 - "Survey Data API"
Cohesion: 0.09
Nodes (33): Gather Survey Data for AI, AnswerCreate, AnswerUpsert, _base_context(), calculate_median(), calculate_mode(), calculate_quartiles(), calculate_std_dev() (+25 more)

### Community 4 - "App Layout & i18n"
Cohesion: 0.11
Nodes (17): inter, metadata, Home(), Language, LanguageContext, LanguageContextType, LanguageProvider(), translations (+9 more)

### Community 5 - "AI Analysis API"
Cohesion: 0.14
Nodes (24): AiInsightsTab Component, POST /api/surveys/{id}/ai-archetypes (Archetypes), POST /api/surveys/{id}/ai-beliefs (Belief Network), POST /api/surveys/{id}/ai-blindspots (Blind Spots), POST /api/surveys/{id}/ai-minority (Minority Insights), POST /api/surveys/{id}/ai-mood (Mood Heatmap), POST /api/surveys/{id}/ai-analysis (Persuadability), _base_context (AI Prompt Builder) (+16 more)

### Community 6 - "Survey CRUD Endpoints"
Cohesion: 0.09
Nodes (22): complete_session(), delete_all_responses(), delete_share_link(), delete_single_response(), delete_survey(), get_share_links(), get_survey(), get_survey_results() (+14 more)

### Community 7 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "PDF Translation Plan"
Cohesion: 0.11
Nodes (16): code:text (pdfplumber), code:bash (git add src/app/admin/edit/[id]/page.tsx && git commit -m "f), code:bash (git add -A && git commit -m "test: verify PDF translation up), code:bash (git add api/requirements.txt && git commit -m "chore: add pd), code:python (import pdfplumber), code:python (GEMINI_MODEL = "gemini-3.5-flash"), code:python (@app.post("/api/surveys/{survey_id}/translation/upload")), code:python (import httpx) (+8 more)

### Community 9 - "Python Scripts & Utils"
Cohesion: 0.27
Nodes (15): Database check script, Insert check script, python-dotenv, FastAPI framework, List questions script, List surveys script, Python dependencies, Seed 1000 responses (+7 more)

### Community 10 - "Frontend Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, html-react-parser, lucide-react, next, nodemailer, react, react-dom (+7 more)

### Community 11 - "PDF Translation Design"
Cohesion: 0.13
Nodes (14): 1. Problem, 2.1 New API Endpoint, 2.2 Gemini Prompt Strategy, 2.3 Authentication, 2.4 Frontend Change (Admin Edit Page), 2. Architecture, 3. Error Handling, 4. Data Flow (+6 more)

### Community 12 - "Validation Design Spec"
Cohesion: 0.14
Nodes (13): Admin UI (Create/Edit), Background, code:jsonc ({), Data Model, Files to Modify, Goal, No database migration needed, `options` JSONB — new fields (+5 more)

### Community 13 - "AI Analysis Suite"
Cohesion: 0.31
Nodes (13): AI Analysis Suite, ai_archetypes(), ai_belief_network(), ai_blindspots(), ai_minority_insights(), ai_mood_heatmap(), ai_persuadability_analysis(), AIAnalysisRequest (+5 more)

### Community 14 - "Survey Editor Components"
Cohesion: 0.18
Nodes (8): RichTextEditor(), RichTextEditorProps, QuestionDraft, QuestionType, VALIDATION_PRESETS, QuestionDraft, QuestionType, VALIDATION_PRESETS

### Community 15 - "Core Platform Pages"
Cohesion: 0.24
Nodes (11): Create Survey Admin Page, Edit Survey Admin Page, Attention Check Failure Tracking, Published Survey Editing Lock, Translation CRUD Endpoints, Header with Language Switcher, Survey Respondent Page, Attention Check Injection (+3 more)

### Community 16 - "Survey Mutation API"
Cohesion: 0.24
Nodes (11): create_survey(), duplicate_survey(), Logic Gate ID Remapping, Toggle a survey's active status., Create a new survey and its questions, Duplicate an existing survey and its questions, Update an existing survey and its questions. Fails if the survey has ever been p, SurveyCreate (+3 more)

### Community 17 - "Package Metadata"
Cohesion: 0.18
Nodes (10): author, description, keywords, license, main, name, private, type (+2 more)

### Community 18 - "Dev Dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, eslint, tailwindcss, @tailwindcss/postcss, @types/node, @types/nodemailer, @types/react, @types/react-dom (+3 more)

### Community 19 - "Infrastructure & CI/CD"
Cohesion: 0.25
Nodes (11): _call_gemini (Gemini API Wrapper), FastAPI CYC Survey API, GET /api/test-gemini, POST /api/surveys/{survey_id}/translation/upload (PDF Translation), CI/CD & Docker Design Document, Docker Compose Dev Stack, Google Gemini 2.5 Flash (AI Model), GitHub Actions CI Pipeline (+3 more)

### Community 20 - "Paginated API & Types"
Cohesion: 0.25
Nodes (9): _call_gemini(), get_survey_responses_paginated(), get_surveys(), bool, Get surveys and their response counts, Shared helper: call Gemini and parse the JSON response., Fetch individual responses with pagination., bool (+1 more)

### Community 21 - "Logic Gating Tests"
Cohesion: 0.32
Nodes (4): Any, get_logic_gate_match_type(), get_logic_gates_from_question(), str

### Community 22 - "Results & Insights UI"
Cohesion: 0.25
Nodes (4): AiModuleKey, Answer, Question, Response

### Community 23 - "Graphify Knowledge Graph"
Cohesion: 0.29
Nodes (7): GRAPH_REPORT.md, graphify explain CLI, graphify-out/, graphify path CLI, graphify query CLI, graphify update CLI, Knowledge Graph (graphify)

### Community 24 - "Public Assets & Tech"
Cohesion: 0.43
Nodes (7): public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, Next.js Framework, Vercel Platform, create-next-app Scaffold

### Community 25 - "Validation Test Suite"
Cohesion: 0.33
Nodes (6): Tests for short_answer validation logic without requiring a running server., Replicate the validation logic that should happen client-side and server-side., run_tests(), validate_postal_code_prefix(), bool, str

### Community 26 - "Gemini & File Upload"
Cohesion: 0.33
Nodes (6): Call Gemini API, Upload a PDF containing translated survey questions and auto-populate translatio, Upload a file to Supabase Storage and return the public URL., upload_file(), upload_translation_pdf(), UploadFile

### Community 27 - "Package Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test

### Community 28 - "Vercel Configuration"
Cohesion: 0.33
Nodes (5): buildCommand, crons, framework, installCommand, rewrites

### Community 29 - "Next.js Config & Cron"
Cohesion: 0.50
Nodes (5): Cron reminders endpoint, Next.js configuration, Next.js framework, TypeScript configuration, Vercel deployment config

### Community 30 - "Brand Assets & Header"
Cohesion: 0.50
Nodes (4): CYC_Logo.png, logo.png, page.tsx (Homepage), HeaderFooter.tsx

### Community 31 - "Translation Update API"
Cohesion: 0.67
Nodes (3): Manually update the translated questions JSON., update_survey_translation(), Request

### Community 32 - "Graphify Plugin Config"
Cohesion: 0.67
Nodes (3): Graphify OpenCode plugin, OpenCode configuration, OpenCode plugin package

### Community 35 - "ESLint Config"
Cohesion: 0.67
Nodes (3): eslint-config-next, ESLint configuration, eslint-config-next

## Knowledge Gaps
- **212 isolated node(s):** `buildCommand`, `installCommand`, `framework`, `rewrites`, `crons` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CYC Survey Platform README` connect `Infrastructure & CI/CD` to `Package Metadata`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `pdfplumber` connect `Admin Pages & Data` to `Survey Data API`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **What connects `buildCommand`, `installCommand`, `framework` to the rest of the system?**
  _245 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Admin Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Admin Pages & Data` be split into smaller, more focused modules?**
  _Cohesion score 0.05573770491803279 - nodes in this community are weakly interconnected._
- **Should `Short Answer Validation Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.047619047619047616 - nodes in this community are weakly interconnected._
- **Should `Survey Data API` be split into smaller, more focused modules?**
  _Cohesion score 0.0944741532976827 - nodes in this community are weakly interconnected._