# Graph Report - .  (2026-06-02)

## Corpus Check
- 103 files · ~52,091 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 826 nodes · 1119 edges · 95 communities (65 shown, 30 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 84 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Pages and Database|Admin Pages and Database]]
- [[_COMMUNITY_Admin Dashboard API|Admin Dashboard API]]
- [[_COMMUNITY_Frontend UI Components|Frontend UI Components]]
- [[_COMMUNITY_Short Answer Validation|Short Answer Validation]]
- [[_COMMUNITY_Python Test Utilities|Python Test Utilities]]
- [[_COMMUNITY_AI Data Processing|AI Data Processing]]
- [[_COMMUNITY_AI Insights Endpoints|AI Insights Endpoints]]
- [[_COMMUNITY_AI Analysis Types|AI Analysis Types]]
- [[_COMMUNITY_Testing Infrastructure|Testing Infrastructure]]
- [[_COMMUNITY_CI CD and Security|CI CD and Security]]
- [[_COMMUNITY_Survey CRUD Operations|Survey CRUD Operations]]
- [[_COMMUNITY_Survey Editor Components|Survey Editor Components]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_PDF Translation Docs|PDF Translation Docs]]
- [[_COMMUNITY_Survey API Operations|Survey API Operations]]
- [[_COMMUNITY_Development Dependencies|Development Dependencies]]
- [[_COMMUNITY_Package Configuration|Package Configuration]]
- [[_COMMUNITY_PDF Translation Design|PDF Translation Design]]
- [[_COMMUNITY_Python Scripts|Python Scripts]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Docker and Validation|Docker and Validation]]
- [[_COMMUNITY_Docker Build Config|Docker Build Config]]
- [[_COMMUNITY_AI Survey Analysis|AI Survey Analysis]]
- [[_COMMUNITY_Validation Tests|Validation Tests]]
- [[_COMMUNITY_Admin Attention API|Admin Attention API]]
- [[_COMMUNITY_Gemini API Integration|Gemini API Integration]]
- [[_COMMUNITY_Docker and AI Config|Docker and AI Config]]
- [[_COMMUNITY_Logic Gating Tests|Logic Gating Tests]]
- [[_COMMUNITY_Admin Share Links|Admin Share Links]]
- [[_COMMUNITY_Graphify CLI Plugin|Graphify CLI Plugin]]
- [[_COMMUNITY_Public Assets|Public Assets]]
- [[_COMMUNITY_Survey Session Routes|Survey Session Routes]]
- [[_COMMUNITY_Short Answer Tests|Short Answer Tests]]
- [[_COMMUNITY_Cron Framework Build|Cron Framework Build]]
- [[_COMMUNITY_FastAPI Endpoints|FastAPI Endpoints]]
- [[_COMMUNITY_Admin Auth Mocks|Admin Auth Mocks]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Admin Auth Tests|Admin Auth Tests]]
- [[_COMMUNITY_Lint Config Files|Lint Config Files]]
- [[_COMMUNITY_Logo and Icons|Logo and Icons]]
- [[_COMMUNITY_Check Survey Status|Check Survey Status]]
- [[_COMMUNITY_Testendpoints Results Endpoint|Testendpoints Results Endpoint]]
- [[_COMMUNITY_Testlimit Summary Response|Testlimit Summary Response]]
- [[_COMMUNITY_Query Testquery Answers|Query Testquery Answers]]
- [[_COMMUNITY_Opencode Plugin Graphify|Opencode Plugin Graphify]]
- [[_COMMUNITY_Opencode Json Plugin|Opencode Json Plugin]]
- [[_COMMUNITY_Dependencies Opencode Plugin|Dependencies Opencode Plugin]]
- [[_COMMUNITY_Tailwindcss Postcss Configuration|Tailwindcss Postcss Configuration]]
- [[_COMMUNITY_Css Lint Unknownatrules|Css Lint Unknownatrules]]
- [[_COMMUNITY_Update Step Current|Update Step Current]]
- [[_COMMUNITY_Agents Graphify|Agents Graphify]]
- [[_COMMUNITY_Eslintconfig Eslint Config|Eslintconfig Eslint Config]]
- [[_COMMUNITY_Nextconfig Next Config|Nextconfig Next Config]]
- [[_COMMUNITY_Config Postcss Mjs|Config Postcss Mjs]]
- [[_COMMUNITY_Startbutton Survey Flow|Startbutton Survey Flow]]
- [[_COMMUNITY_Husky Script|Husky Script]]
- [[_COMMUNITY_Short Answer Validation|Short Answer Validation]]
- [[_COMMUNITY_Get User Profile|Get User Profile]]
- [[_COMMUNITY_Patch Sessions Session|Patch Sessions Session]]
- [[_COMMUNITY_Settings|Settings]]
- [[_COMMUNITY_Cyc Logo Full|Cyc Logo Full]]
- [[_COMMUNITY_Cyc Favicon App|Cyc Favicon App]]
- [[_COMMUNITY_File Icon Svg|File Icon Svg]]
- [[_COMMUNITY_Get User Profile|Get User Profile]]
- [[_COMMUNITY_Rich Text Renderer|Rich Text Renderer]]
- [[_COMMUNITY_Sqlalchemy|Sqlalchemy]]
- [[_COMMUNITY_Pydantic|Pydantic]]
- [[_COMMUNITY_Pre Commit|Pre Commit]]
- [[_COMMUNITY_Pyjwt|Pyjwt]]
- [[_COMMUNITY_Asyncpg|Asyncpg]]

## God Nodes (most connected - your core abstractions)
1. `str` - 33 edges
2. `str` - 33 edges
3. `handle_ai_analysis()` - 18 edges
4. `Short Answer Validation` - 17 edges
5. `compilerOptions` - 16 edges
6. `PDF Translation Upload` - 16 edges
7. `get_survey_summary()` - 15 edges
8. `scripts` - 14 edges
9. `useLanguage()` - 13 edges
10. `questions Table` - 11 edges

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

## Communities (95 total, 30 thin omitted)

### Community 0 - "Admin Pages and Database"
Cohesion: 0.06
Nodes (60): Admin Create Page, Admin survey edit page, Admin Results Page, ai_analyses Table, answers Table, GET /api/cron/reminders Route, Custom Regex Validation, CYC Survey Platform (+52 more)

### Community 1 - "Admin Dashboard API"
Cohesion: 0.06
Nodes (59): AdminDashboard Component, AdminLayout Component, AdminLogin Component, POST /api/sessions/{id}/attention-failure, POST /api/surveys/{id}/check-status, POST /api/surveys/{id}/check-status, PATCH /api/sessions/{session_id}/complete, POST /api/surveys/{survey_id}/sessions (+51 more)

### Community 2 - "Frontend UI Components"
Cohesion: 0.06
Nodes (33): inter, metadata, Home(), Survey, TiltCardProps, Language, LanguageContext, LanguageContextType (+25 more)

### Community 3 - "Short Answer Validation"
Cohesion: 0.05
Nodes (37): code:typescript ('Please enter exactly 3 characters in the format A1A (letter), code:typescript (const updateValidationType = (qId: string, type: string) => ), code:typescript (} else if (q.type === 'short_answer') {), code:typescript (} else if (q.type === 'short_answer') {), code:tsx ({/* Question Description (all types) */}), code:tsx ({/* Short Answer Validation Config */}), code:bash (git add src/app/admin/create/page.tsx), code:bash (git add src/app/admin/edit/[id]/page.tsx) (+29 more)

### Community 4 - "Python Test Utilities"
Cohesion: 0.11
Nodes (12): int, float, TestCalculateMedian, TestCalculateMode, TestCalculateQuartiles, TestCalculateStdDev, TestFindOutliers, calculate_median() (+4 more)

### Community 5 - "AI Data Processing"
Cohesion: 0.09
Nodes (32): Gather Survey Data for AI, AnswerCreate, AnswerUpsert, _base_context(), calculate_median(), calculate_mode(), calculate_quartiles(), calculate_std_dev() (+24 more)

### Community 6 - "AI Insights Endpoints"
Cohesion: 0.10
Nodes (31): AiInsightsTab Component, POST /api/surveys/{id}/ai-archetypes (Archetypes), POST /api/surveys/{id}/ai-beliefs (Belief Network), POST /api/surveys/{id}/ai-blindspots (Blind Spots), POST /api/surveys/{id}/ai-minority (Minority Insights), POST /api/surveys/{id}/ai-mood (Mood Heatmap), POST /api/surveys/{id}/ai-analysis (Persuadability), _base_context (AI Prompt Builder) (+23 more)

### Community 7 - "AI Analysis Types"
Cohesion: 0.07
Nodes (24): AiMeta, AiModuleData, AiModuleKey, AmplifiedConcern, Archetype, BeliefCluster, BlindSpot, DemographicSegment (+16 more)

### Community 8 - "Testing Infrastructure"
Cohesion: 0.12
Nodes (4): cleanup_surveys(), TestLogicGatingPersistence, TestSurveyCrud, TestSurveySubmission

### Community 9 - "CI CD and Security"
Cohesion: 0.11
Nodes (27): CI Backend Job, CI Docker Build Job, CI E2E Tests Job, CI Frontend Job, CodeQL Security Analysis, CodeQL JavaScript Analysis, CodeQL Python Analysis, Dependabot NPM Updates (+19 more)

### Community 10 - "Survey CRUD Operations"
Cohesion: 0.08
Nodes (25): complete_session(), delete_all_responses(), delete_share_link(), delete_single_response(), delete_survey(), get_share_links(), get_survey(), get_survey_results() (+17 more)

### Community 11 - "Survey Editor Components"
Cohesion: 0.09
Nodes (15): RichTextEditor(), RichTextEditorProps, QuestionDraft, QuestionType, VALIDATION_PRESETS, ApiQuestion, ApiTranslationQuestion, OptionsPayload (+7 more)

### Community 12 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 13 - "PDF Translation Docs"
Cohesion: 0.11
Nodes (16): code:text (pdfplumber), code:bash (git add src/app/admin/edit/[id]/page.tsx && git commit -m "f), code:bash (git add -A && git commit -m "test: verify PDF translation up), code:bash (git add api/requirements.txt && git commit -m "chore: add pd), code:python (import pdfplumber), code:python (GEMINI_MODEL = "gemini-3.5-flash"), code:python (@app.post("/api/surveys/{survey_id}/translation/upload")), code:python (import httpx) (+8 more)

### Community 14 - "Survey API Operations"
Cohesion: 0.14
Nodes (18): Call Gemini API, create_survey(), duplicate_survey(), FastAPI CYC Survey API, Logic Gate ID Remapping, Toggle a survey's active status., Create a new survey and its questions, Duplicate an existing survey and its questions (+10 more)

### Community 15 - "Development Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, husky, jsdom, lint-staged, @playwright/test, prettier, @tailwindcss/postcss (+10 more)

### Community 16 - "Package Configuration"
Cohesion: 0.12
Nodes (15): author, description, eslint-config-next, keywords, license, main, name, private (+7 more)

### Community 17 - "PDF Translation Design"
Cohesion: 0.13
Nodes (14): 1. Problem, 2.1 New API Endpoint, 2.2 Gemini Prompt Strategy, 2.3 Authentication, 2.4 Frontend Change (Admin Edit Page), 2. Architecture, 3. Error Handling, 4. Data Flow (+6 more)

### Community 18 - "Python Scripts"
Cohesion: 0.27
Nodes (15): Database check script, Insert check script, python-dotenv, FastAPI framework, List questions script, List surveys script, Python dependencies, Seed 1000 responses (+7 more)

### Community 19 - "Frontend Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, html-react-parser, lucide-react, next, nodemailer, react, react-dom (+7 more)

### Community 20 - "Docker and Validation"
Cohesion: 0.14
Nodes (13): Admin UI (Create/Edit), Background, code:jsonc ({), Data Model, Files to Modify, Goal, No database migration needed, `options` JSONB — new fields (+5 more)

### Community 21 - "Docker Build Config"
Cohesion: 0.14
Nodes (14): scripts, build, dev, docker:build, docker:down, docker:up, format, format:check (+6 more)

### Community 22 - "AI Survey Analysis"
Cohesion: 0.31
Nodes (13): AI Analysis Suite, ai_archetypes(), ai_belief_network(), ai_blindspots(), ai_minority_insights(), ai_mood_heatmap(), ai_persuadability_analysis(), AIAnalysisRequest (+5 more)

### Community 23 - "Validation Tests"
Cohesion: 0.27
Nodes (4): TestShortAnswerValidation, validate_postal_code_prefix(), bool, str

### Community 24 - "Admin Attention API"
Cohesion: 0.24
Nodes (11): Create Survey Admin Page, Edit Survey Admin Page, Attention Check Failure Tracking, Published Survey Editing Lock, Translation CRUD Endpoints, Header with Language Switcher, Survey Respondent Page, Attention Check Injection (+3 more)

### Community 25 - "Gemini API Integration"
Cohesion: 0.24
Nodes (10): _call_gemini(), get_survey_responses_paginated(), get_surveys(), bool, int, Get surveys and their response counts, Shared helper: call Gemini and parse the JSON response., Fetch individual responses with pagination. (+2 more)

### Community 26 - "Docker and AI Config"
Cohesion: 0.31
Nodes (9): _call_gemini (Gemini API Wrapper), GET /api/test-gemini, POST /api/surveys/{survey_id}/translation/upload (PDF Translation), CI/CD & Docker Design Document, Docker Compose Dev Stack, Google Gemini 2.5 Flash (AI Model), GitHub Actions CI Pipeline, CI/CD & Docker Implementation Plan (+1 more)

### Community 27 - "Logic Gating Tests"
Cohesion: 0.32
Nodes (4): Any, get_logic_gate_match_type(), get_logic_gates_from_question(), str

### Community 28 - "Admin Share Links"
Cohesion: 0.25
Nodes (5): ShareLink, Survey, mockPush, mockSurveys, newSurveyLink

### Community 29 - "Graphify CLI Plugin"
Cohesion: 0.29
Nodes (7): GRAPH_REPORT.md, graphify explain CLI, graphify-out/, graphify path CLI, graphify query CLI, graphify update CLI, Knowledge Graph (graphify)

### Community 30 - "Public Assets"
Cohesion: 0.43
Nodes (7): public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, Next.js Framework, Vercel Platform, create-next-app Scaffold

### Community 31 - "Survey Session Routes"
Cohesion: 0.33
Nodes (5): ActiveSurvey, CompletedSession, GET(), IncompleteSession, request

### Community 32 - "Short Answer Tests"
Cohesion: 0.33
Nodes (6): Tests for short_answer validation logic without requiring a running server., Replicate the validation logic that should happen client-side and server-side., run_tests(), validate_postal_code_prefix(), bool, str

### Community 33 - "Cron Framework Build"
Cohesion: 0.33
Nodes (5): buildCommand, crons, framework, installCommand, rewrites

### Community 36 - "Next.js Config"
Cohesion: 0.50
Nodes (5): Cron reminders endpoint, Next.js configuration, Next.js framework, TypeScript configuration, Vercel deployment config

### Community 38 - "Lint Config Files"
Cohesion: 0.50
Nodes (3): *.{js,jsx}, *.{json,md,yml,yaml,css,scss}, *.{ts,tsx}

### Community 39 - "Logo and Icons"
Cohesion: 0.50
Nodes (4): CYC_Logo.png, logo.png, page.tsx (Homepage), HeaderFooter.tsx

### Community 40 - "Check Survey Status"
Cohesion: 0.67
Nodes (3): check_survey_status(), CheckStatusRequest, Check if the given email has already submitted the survey.

### Community 44 - "Opencode Plugin Graphify"
Cohesion: 0.67
Nodes (3): Graphify OpenCode plugin, OpenCode configuration, OpenCode plugin package

### Community 47 - "Tailwindcss Postcss Configuration"
Cohesion: 0.67
Nodes (3): tailwindcss, PostCSS configuration, Tailwind CSS

## Ambiguous Edges - Review These
- `Backend Docker Service` → `PostgreSQL Docker Service`  [AMBIGUOUS]
  docker-compose.yml · relation: conceptually_related_to

## Knowledge Gaps
- **301 isolated node(s):** `buildCommand`, `installCommand`, `framework`, `rewrites`, `crons` (+296 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Backend Docker Service` and `PostgreSQL Docker Service`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `CYC Survey Platform README` connect `Docker and AI Config` to `Package Configuration`, `Survey API Operations`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `FastAPI CYC Survey API` connect `Survey API Operations` to `CI CD and Security`, `Docker and AI Config`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `pdfplumber` connect `Admin Pages and Database` to `AI Data Processing`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `buildCommand`, `installCommand`, `framework` to the rest of the system?**
  _334 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Pages and Database` be split into smaller, more focused modules?**
  _Cohesion score 0.05573770491803279 - nodes in this community are weakly interconnected._
- **Should `Admin Dashboard API` be split into smaller, more focused modules?**
  _Cohesion score 0.05902980713033314 - nodes in this community are weakly interconnected._