# Phase 2: Quality & Security Design

> **Scope:** Issue #17, Sections 2-3 — "Code Quality Gates" + "Security Scanning" + "Pre-Commit Hooks" + CI QoL. Builds on Phase 1 (testing infrastructure already in place).
> **Team Size:** 3 developers. Optimized for low friction, high impact.

**Goal:** Harden code quality and security posture without slowing down daily development. Add formatting enforcement, pre-commit hooks, tighter lint rules, security scanning, and CI quality-of-life improvements.

**Tech Stack:** Prettier, Husky, lint-staged, ruff, pre-commit, CodeQL, Dependabot, GitHub Actions.

---

## 1. Context & Motivation

Phase 1 established the testing foundation (37 frontend tests, 21 backend unit tests, Playwright E2E). Now the codebase needs:
- Consistent formatting without manual enforcement
- Automatic prevention of common mistakes (secrets, vulnerabilities)
- Faster CI feedback loops
- Security visibility without ongoing maintenance burden

With only 3 developers, every process must justify its time cost. This design ruthlessly prioritizes tools that run automatically with zero daily friction.

---

## 2. Code Formatting Enforcement

### 2.1 Frontend (Prettier)

**Rationale:** Manual code style discussions waste time in small teams. Prettier auto-formats on save and in pre-commit hooks.

**Configuration:**
- Create `.prettierrc` with opinionated defaults (no bikeshedding):
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "trailingComma": "es5",
    "printWidth": 100
  }
  ```
- Add to `package.json` devDependencies: `prettier`
- Add scripts:
  ```json
  "format": "prettier --write .",
  "format:check": "prettier --check ."
  ```
- Add `.prettierignore` (exclude `node_modules/`, `.next/`, `dist/`, `coverage/`)

**CI enforcement:**
- Add `npm run format:check` to frontend CI job (after lint, before build)
- Fail build if formatting is off

### 2.2 Backend (ruff format)

**Rationale:** `ruff` already runs in CI for linting. Adding `ruff format --check` is one line.

**Configuration:**
- Add to CI backend job: `ruff format --check api/` (after `ruff check`)
- Document for contributors: `ruff format api/` fixes formatting
- No new config needed — ruff uses PEP 8 style by default

**Scope:** Only check `api/` directory (not `tests/` — test readability matters more than strict formatting).

---

## 3. Pre-Commit Hooks

### 3.1 Frontend (Husky + lint-staged)

**Rationale:** Catches formatting and lint issues BEFORE commit. With 3 people, nobody wants to push → wait for CI → fail → fix → push again.

**Setup:**
1. Install: `npm install --save-dev husky lint-staged`
2. Initialize: `npx husky init`
3. Configure `.lintstagedrc.json`:
   ```json
   {
     "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
     "*.{js,jsx}": ["prettier --write", "eslint --fix"],
     "*.{json,md,yml,yaml}": ["prettier --write"]
   }
   ```
4. Create `.husky/pre-commit`:
   ```bash
   npx lint-staged
   ```

**Behavior:**
- Only runs on files actually being committed (not whole repo)
- Auto-fixes formatting and ESLint autofixable issues
- If fix creates new changes, blocks commit so developer can review
- Takes ~2 seconds for typical commit

**Skip option:** `git commit --no-verify` for emergencies (discouraged but available).

### 3.2 Backend (pre-commit framework)

**Rationale:** Python doesn't have lint-staged equivalent. `pre-commit` framework is the standard.

**Setup:**
1. Install: `pip install pre-commit`
2. Create `.pre-commit-config.yaml`:
   ```yaml
   repos:
     - repo: https://github.com/astral-sh/ruff-pre-commit
       rev: v0.14.0
       hooks:
         - id: ruff
           args: [--fix]
         - id: ruff-format
   ```
3. Install hook: `pre-commit install`
4. Run on all files once: `pre-commit run --all-files`

**Behavior:**
- Runs `ruff --fix` and `ruff-format` on staged Python files
- Blocks commit if unfixable issues remain
- Cached per-file (fast after first run)

**Skip option:** `git commit --no-verify` for emergencies.

---

## 4. Tightened Lint Rules

### 4.1 Frontend (ESLint)

**Rationale:** With 3 people, we enable only the rules that catch real bugs, not style preferences (Prettier handles style).

**Rules to enable:**
1. `@typescript-eslint/no-unused-vars` — catches dead code, typoed imports
2. `@typescript-eslint/no-explicit-any` — forces better typing over time

**Rules to skip (for now):**
- `strict-boolean-expressions` — too noisy with common React patterns (`&&` rendering)
- All formatting rules — Prettier handles this
- Complexity/cognitive rules — premature for this codebase size

**Migration strategy:**
1. Enable rules as "warn" first, fix existing violations in a single PR
2. Then flip to "error"
3. This avoids a giant "fix everything" PR mixed with feature work

### 4.2 Backend (ruff)

**Rationale:** `ruff` already runs in CI. We expand the rule set slightly.

**Current state:** Likely running default `E` + `F` rules.

**Rules to add:**
- `I` (isort) — import sorting (auto-fixable)
- `UP` (pyupgrade) — modern Python syntax (auto-fixable)
- `B` (flake8-bugbear) — catches likely bugs

**Rules to skip:**
- `N` (pep8-naming) — too noisy for existing codebase
- `C90` (mccabe complexity) — not needed for 3-person team
- Type checking — deferred to dedicated typing sprint

**Configuration:** Add to `pyproject.toml` or `ruff.toml`:
```toml
[tool.ruff]
select = ["E", "F", "I", "UP", "B"]
ignore = ["E501"]  # line length handled by formatter

[tool.ruff.lint.pydocstyle]
convention = "google"
```

---

## 5. Security Scanning

### 5.1 CodeQL (Static Analysis)

**Rationale:** Free for public repos. Catches security vulnerabilities without configuration.

**Setup:**
- Create `.github/workflows/codeql.yml`:
  ```yaml
  name: "CodeQL"
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
    schedule:
      - cron: '0 9 * * 1'  # Weekly Monday 9am
  jobs:
    analyze:
      runs-on: ubuntu-latest
      strategy:
        matrix:
          language: [javascript, python]
      steps:
        - uses: actions/checkout@v4
        - uses: github/codeql-action/init@v3
          with:
            languages: ${{ matrix.language }}
        - uses: github/codeql-action/analyze@v3
  ```

**Behavior:**
- Runs automatically on PRs and weekly
- Zero maintenance after setup
- Results appear in GitHub Security tab

### 5.2 Dependabot

**Rationale:** Automated dependency updates. Small teams often fall behind on security patches.

**Setup:**
- Create `.github/dependabot.yml`:
  ```yaml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
        interval: "weekly"
      open-pull-requests-limit: 5
    - package-ecosystem: "pip"
      directory: "/"
      schedule:
        interval: "weekly"
      open-pull-requests-limit: 5
  ```

**Behavior:**
- Opens PRs weekly for outdated dependencies
- Includes security patches automatically (higher priority)
- Team merges when convenient

### 5.3 Secret Scanning

**Rationale:** Prevent accidentally committed credentials.

**Approach (lean):**
- GitHub already scans all pushed commits for secrets (free for public repos)
- Verify `.gitignore` includes `.env*` (already done — verified in repo)
- **Skip gitleaks pre-commit hook** — adds ~5 seconds to every commit, GitHub catches it on push anyway
- Add a one-time audit: check `git log --all --grep='password\|secret\|key\|token'` for any historical leaks

---

## 6. CI QoL Improvements

### 6.1 Updates to `.github/workflows/ci.yml`

**Additions:**

1. **workflow_dispatch** — manual trigger:
   ```yaml
   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]
     workflow_dispatch:  # NEW: manual runs from GitHub UI
   ```

2. **Concurrency** — cancel redundant runs:
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true
   ```

3. **Caching** — faster builds:
   - Frontend: `actions/setup-node` already caches npm, but add explicit `.next/` cache
   - Backend: Add `actions/cache` for pip cache directory

4. **Scheduled nightly builds** — catch issues even without PRs:
   ```yaml
   schedule:
     - cron: '0 6 * * *'  # Daily 6am UTC
   ```

5. **Action pinning** — supply chain security:
   - Pin all `actions/*` to specific commit SHAs instead of floating tags
   - Use GitHub's built-in Dependabot to update action versions

### 6.2 New Workflow: Security Audit

Create `.github/workflows/security-audit.yml`:
```yaml
name: Security Audit
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'
jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm audit --audit-level=moderate
  # pip-audit job can be added later when pip-audit is installed
```

**Note:** `npm audit` runs with `--audit-level=moderate` to avoid noise from low-severity advisories.

---

## 7. Files Changed

### New Files
- `.prettierrc` — Prettier config
- `.prettierignore` — Prettier exclusions
- `.lintstagedrc.json` — lint-staged config
- `.husky/pre-commit` — Git pre-commit hook
- `.pre-commit-config.yaml` — Python pre-commit config
- `.github/workflows/codeql.yml` — CodeQL analysis
- `.github/workflows/security-audit.yml` — Dependency auditing
- `.github/dependabot.yml` — Automated dependency updates

### Modified Files
- `package.json` — add prettier, husky, lint-staged; add format scripts
- `.github/workflows/ci.yml` — add formatting checks, caching, concurrency, workflow_dispatch
- `eslint.config.js` or `.eslintrc.json` — enable no-unused-vars, no-explicit-any
- `pyproject.toml` or `ruff.toml` — expand ruff rule set
- Various source files — fix lint/format violations triggered by new rules

---

## 8. Out of Scope (Phase 3+)

The following are explicitly deferred:

- **mypy / pyright type checking** → Phase 3 (requires dedicated typing sprint)
- **Docker / containerization** → Phase 4
- **Deployment automation / Vercel integration** → Phase 4
- **Health endpoints (/health)** → Phase 4
- **Sentry configuration verification** → Phase 4
- **Alembic database migrations** → Phase 5
- **Admin page unit tests** → Phase 3 or dedicated component refactor
- **More ESLint rules** (strict-boolean-expressions, complexity) → Add only when they catch a real bug
- **gitleaks local pre-commit hook** → GitHub secret scanning is sufficient for 3-person team

---

## 9. Acceptance Criteria

- [ ] `npm run format:check` passes in CI (no unformatted files)
- [ ] `ruff format --check api/` passes in CI
- [ ] Pre-commit hooks run successfully on a test commit (both frontend and backend)
- [ ] ESLint `no-unused-vars` and `no-explicit-any` enabled, all existing violations fixed
- [ ] ruff rule set expanded to include `I`, `UP`, `B`, all existing violations fixed
- [ ] CodeQL workflow runs successfully on PR
- [ ] Dependabot configured for npm and pip
- [ ] CI has `workflow_dispatch`, `concurrency`, and caching
- [ ] `npm audit` runs in CI (security audit workflow)
- [ ] No new secrets in git history (one-time audit)
- [ ] All Phase 1 tests still pass (no regressions)

---

*Design approved: 2026-05-29*
*Next step: Write implementation plan using writing-plans skill.*
