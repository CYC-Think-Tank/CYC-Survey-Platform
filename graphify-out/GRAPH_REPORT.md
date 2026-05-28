# Graph Report - .  (2026-05-27)

## Corpus Check
- Corpus is ~46,985 words - fits in a single context window. You may not need a graph.

## Summary
- 393 nodes · 540 edges · 49 communities (35 shown, 14 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Backend Endpoints|API Backend Endpoints]]
- [[_COMMUNITY_Features & Validation System|Features & Validation System]]
- [[_COMMUNITY_Package & Build Config|Package & Build Config]]
- [[_COMMUNITY_Pages & UI Components|Pages & UI Components]]
- [[_COMMUNITY_App Router & Contexts|App Router & Contexts]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_AI Analysis & Results API|AI Analysis & Results API]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Python Admin Scripts|Python Admin Scripts]]
- [[_COMMUNITY_Database Schema & Models|Database Schema & Models]]
- [[_COMMUNITY_Survey Editor UI|Survey Editor UI]]
- [[_COMMUNITY_AI Insights Dashboard|AI Insights Dashboard]]
- [[_COMMUNITY_Graphify Knowledge Graph|Graphify Knowledge Graph]]
- [[_COMMUNITY_Tech Stack Brand Icons|Tech Stack Brand Icons]]
- [[_COMMUNITY_Vercel Deployment Config|Vercel Deployment Config]]
- [[_COMMUNITY_Validation Test Suite|Validation Test Suite]]
- [[_COMMUNITY_CYC Branding Assets|CYC Branding Assets]]
- [[_COMMUNITY_OpenCode Config|OpenCode Config]]
- [[_COMMUNITY_OpenCode Schema|OpenCode Schema]]
- [[_COMMUNITY_OpenCode Dependencies|OpenCode Dependencies]]
- [[_COMMUNITY_VS Code Settings|VS Code Settings]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Validation Test Helpers|Validation Test Helpers]]
- [[_COMMUNITY_User Profile API|User Profile API]]
- [[_COMMUNITY_Step Update API|Step Update API]]
- [[_COMMUNITY_Gemini Test API|Gemini Test API]]
- [[_COMMUNITY_VS Code Settings (singleton)|VS Code Settings (singleton)]]
- [[_COMMUNITY_CYC Logo Image|CYC Logo Image]]
- [[_COMMUNITY_CYC Favicon Image|CYC Favicon Image]]
- [[_COMMUNITY_File Icon SVG|File Icon SVG]]

## God Nodes (most connected - your core abstractions)
1. `str` - 33 edges
2. `Short Answer Validation` - 17 edges
3. `compilerOptions` - 16 edges
4. `PDF Translation Upload` - 16 edges
5. `handle_ai_analysis()` - 12 edges
6. `useLanguage()` - 11 edges
7. `questions Table` - 11 edges
8. `Supabase Python client` - 9 edges
9. `AdminDashboard Component` - 9 edges
10. `EditSurvey Component` - 9 edges

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

## Communities (49 total, 14 thin omitted)

### Community 0 - "API Backend Endpoints"
Cohesion: 0.07
Nodes (60): ai_archetypes(), ai_belief_network(), ai_blindspots(), ai_minority_insights(), ai_mood_heatmap(), ai_persuadability_analysis(), AIAnalysisRequest, AnswerCreate (+52 more)

### Community 1 - "Features & Validation System"
Cohesion: 0.07
Nodes (48): Admin Create Page, Admin survey edit page, Admin Results Page, ai_analyses Table, Custom Regex Validation, CYC Survey Platform, Client + Server Validation, Email Validation (+40 more)

### Community 2 - "Package & Build Config"
Cohesion: 0.06
Nodes (35): Cron reminders endpoint, author, description, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss (+27 more)

### Community 3 - "Pages & UI Components"
Cohesion: 0.09
Nodes (36): AdminDashboard Component, AdminLayout Component, AdminLogin Component, POST /api/sessions/{id}/attention-failure, POST /api/surveys/{id}/check-status, PATCH /api/sessions/{id}/complete, POST /api/surveys/{id}/sessions, POST /api/surveys (+28 more)

### Community 4 - "App Router & Contexts"
Cohesion: 0.11
Nodes (17): inter, metadata, Home(), Language, LanguageContext, LanguageContextType, LanguageProvider(), translations (+9 more)

### Community 5 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "AI Analysis & Results API"
Cohesion: 0.17
Nodes (17): AiInsightsTab Component, POST /api/surveys/{id}/ai-archetypes, POST /api/surveys/{id}/ai-beliefs, POST /api/surveys/{id}/ai-blindspots, POST /api/surveys/{id}/ai-minority, POST /api/surveys/{id}/ai-mood, POST /api/surveys/{id}/ai-analysis, DELETE /api/surveys/{id}/responses (+9 more)

### Community 7 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): dependencies, framer-motion, html-react-parser, lucide-react, next, nodemailer, react, react-dom (+7 more)

### Community 8 - "Python Admin Scripts"
Cohesion: 0.27
Nodes (15): Database check script, Insert check script, python-dotenv, FastAPI framework, List questions script, List surveys script, Python dependencies, Seed 1000 responses (+7 more)

### Community 9 - "Database Schema & Models"
Cohesion: 0.22
Nodes (14): answers Table, GET /api/cron/reminders Route, Database Schema (SQL), FastAPI Application, Pydantic Models (Question, SurveyList, etc.), question_type ENUM, Question Types, questions Table (+6 more)

### Community 10 - "Survey Editor UI"
Cohesion: 0.18
Nodes (8): RichTextEditor(), RichTextEditorProps, QuestionDraft, QuestionType, VALIDATION_PRESETS, QuestionDraft, QuestionType, VALIDATION_PRESETS

### Community 11 - "AI Insights Dashboard"
Cohesion: 0.25
Nodes (4): AiModuleKey, Answer, Question, Response

### Community 12 - "Graphify Knowledge Graph"
Cohesion: 0.29
Nodes (7): GRAPH_REPORT.md, graphify explain CLI, graphify-out/, graphify path CLI, graphify query CLI, graphify update CLI, Knowledge Graph (graphify)

### Community 13 - "Tech Stack Brand Icons"
Cohesion: 0.43
Nodes (7): public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, Next.js Framework, Vercel Platform, create-next-app Scaffold

### Community 14 - "Vercel Deployment Config"
Cohesion: 0.33
Nodes (5): buildCommand, crons, framework, installCommand, rewrites

### Community 15 - "Validation Test Suite"
Cohesion: 0.50
Nodes (4): run_tests(), validate_postal_code_prefix(), bool, str

### Community 16 - "CYC Branding Assets"
Cohesion: 0.50
Nodes (4): CYC_Logo.png, logo.png, page.tsx (Homepage), HeaderFooter.tsx

### Community 17 - "OpenCode Config"
Cohesion: 0.67
Nodes (3): Graphify OpenCode plugin, OpenCode configuration, OpenCode plugin package

## Knowledge Gaps
- **134 isolated node(s):** `buildCommand`, `installCommand`, `framework`, `rewrites`, `crons` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `pdfplumber` connect `Features & Validation System` to `API Backend Endpoints`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **Why does `Short Answer Validation` connect `Features & Validation System` to `Pages & UI Components`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `buildCommand`, `installCommand`, `framework` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Backend Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.07191961924907457 - nodes in this community are weakly interconnected._
- **Should `Features & Validation System` be split into smaller, more focused modules?**
  _Cohesion score 0.06717687074829932 - nodes in this community are weakly interconnected._
- **Should `Package & Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06456456456456457 - nodes in this community are weakly interconnected._
- **Should `Pages & UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.0873015873015873 - nodes in this community are weakly interconnected._