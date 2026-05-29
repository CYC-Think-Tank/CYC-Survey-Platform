# Phase 2: Quality & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add formatting enforcement, pre-commit hooks, tightened lint rules, security scanning, and CI quality-of-life improvements to the CYC Survey Platform.

**Architecture:** Prettier auto-formats frontend code, Husky + lint-staged run checks on commit, ESLint catches real bugs with `no-unused-vars` and `no-explicit-any`, ruff handles backend formatting and expanded rules, CodeQL and Dependabot provide security visibility, and CI improvements speed up feedback loops.

**Tech Stack:** Prettier, Husky, lint-staged, ruff, pre-commit, CodeQL, Dependabot, GitHub Actions.

---

## File Structure

```
# NEW FILES
.prettierrc
.prettierignore
.lintstagedrc.json
.husky/pre-commit
.pre-commit-config.yaml
.github/workflows/codeql.yml
.github/workflows/security-audit.yml
.github/dependabot.yml

# MODIFIED FILES
package.json
.github/workflows/ci.yml
eslint.config.mjs
```

---

## Task 1: Install Prettier and Configure

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json`

- [ ] **Step 1: Install Prettier**

Run: `npm install --save-dev prettier`

Expected: `prettier` added to `devDependencies` in `package.json`.

- [ ] **Step 2: Write .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 3: Write .prettierignore**

```
node_modules
.next
dist
coverage
e2e
tests
*.lock
```

- [ ] **Step 4: Add format scripts to package.json**

Add to the `scripts` section:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Verify Prettier works**

Run: `npx prettier --check src/app/page.tsx`

Expected: Either "All matched files use Prettier code style!" or a list of files that need formatting.

- [ ] **Step 6: Commit**

```bash
git add .prettierrc .prettierignore package.json package-lock.json
git commit -m "chore: add Prettier for frontend formatting"
```

---

## Task 2: Install Husky and lint-staged

**Files:**
- Modify: `package.json`
- Create: `.lintstagedrc.json`
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install Husky and lint-staged**

Run: `npm install --save-dev husky lint-staged`

Expected: Both packages added to `devDependencies`.

- [ ] **Step 2: Initialize Husky**

Run: `npx husky init`

Expected: Creates `.husky/` directory with a sample pre-commit hook.

- [ ] **Step 3: Write .lintstagedrc.json**

```json
{
  "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
  "*.{js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,yml,yaml,css,scss}": ["prettier --write"]
}
```

- [ ] **Step 4: Write .husky/pre-commit**

Replace the contents of `.husky/pre-commit` with:

```bash
npx lint-staged
```

- [ ] **Step 5: Add prepare script to package.json**

In `package.json` `scripts`, add:

```json
"prepare": "husky"
```

This ensures husky is installed automatically after `npm install`.

- [ ] **Step 6: Verify pre-commit hook works**

Make a test change to a `.tsx` file (e.g., add an extra space), stage it, and try to commit:

```bash
echo "// test" >> src/app/page.tsx
git add src/app/page.tsx
git commit -m "test: verify pre-commit hook"
```

Expected: lint-staged runs Prettier and ESLint on the staged file. If formatting changes are made, the commit is blocked and you must review and re-stage.

If the commit succeeds, verify the hook ran by checking if the file was formatted.

- [ ] **Step 7: Revert test change**

```bash
git checkout -- src/app/page.tsx
```

- [ ] **Step 8: Commit**

```bash
git add .husky/ .lintstagedrc.json package.json package-lock.json
git commit -m "chore: add Husky + lint-staged pre-commit hooks"
```

---

## Task 3: Enable ESLint no-unused-vars (Warn → Error)

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Enable as warning first**

In `eslint.config.mjs`, change:

```javascript
"@typescript-eslint/no-unused-vars": "off",
```

to:

```javascript
"@typescript-eslint/no-unused-vars": "warn",
```

- [ ] **Step 2: Run lint to see all warnings**

Run: `npm run lint -- --max-warnings=999`

Expected: A list of files with unused variable warnings. Count them.

- [ ] **Step 3: Fix all unused-vars warnings**

For each file reported, either:
- Remove the unused variable/import
- Prefix with underscore if it's intentionally unused (e.g., `_unusedParam`)
- Add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` with a comment explaining why

Run lint after each batch of fixes to verify count decreases.

- [ ] **Step 4: Verify zero warnings**

Run: `npm run lint`

Expected: No `no-unused-vars` warnings remain. (Other pre-existing warnings are okay.)

- [ ] **Step 5: Flip to error**

In `eslint.config.mjs`, change:

```javascript
"@typescript-eslint/no-unused-vars": "warn",
```

to:

```javascript
"@typescript-eslint/no-unused-vars": "error",
```

- [ ] **Step 6: Verify lint passes**

Run: `npm run lint`

Expected: Passes with zero errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "lint: enable no-unused-vars as error and fix all violations"
```

---

## Task 4: Enable ESLint no-explicit-any (Warn → Error)

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Enable as warning first**

In `eslint.config.mjs`, change:

```javascript
"@typescript-eslint/no-explicit-any": "off",
```

to:

```javascript
"@typescript-eslint/no-explicit-any": "warn",
```

- [ ] **Step 2: Run lint to see all warnings**

Run: `npm run lint -- --max-warnings=999`

Expected: A list of files using `any` type. Count them.

- [ ] **Step 3: Fix all no-explicit-any warnings**

For each `any` usage:
- Replace with a proper type if obvious (e.g., `Record<string, unknown>`, `unknown`, specific interface)
- If the type is truly dynamic and can't be typed properly, add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a comment explaining why

Focus on test files and source files. Don't worry about `node_modules` or generated files.

- [ ] **Step 4: Verify zero warnings**

Run: `npm run lint`

Expected: No `no-explicit-any` warnings remain.

- [ ] **Step 5: Flip to error**

In `eslint.config.mjs`, change:

```javascript
"@typescript-eslint/no-explicit-any": "warn",
```

to:

```javascript
"@typescript-eslint/no-explicit-any": "error",
```

- [ ] **Step 6: Verify lint passes**

Run: `npm run lint`

Expected: Passes with zero errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "lint: enable no-explicit-any as error and fix all violations"
```

---

## Task 5: Add ruff format to CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add ruff format check to backend job**

In `.github/workflows/ci.yml`, in the `backend` job, after the `ruff check api/` step, add:

```yaml
      - run: ruff format --check api/
```

The backend job should now look like:

```yaml
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: pip install -r requirements.txt
      - run: ruff check api/
      - run: ruff format --check api/
      - run: pytest tests/unit/ -v
```

- [ ] **Step 2: Verify ruff format locally**

Run: `venv/bin/python -m ruff format --check api/`

Expected: If there are formatting issues, it lists them. If clean, it says "All checks passed!"

- [ ] **Step 3: Fix any formatting violations**

If step 2 found issues, run:

```bash
venv/bin/python -m ruff format api/
```

Then verify again with `--check`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add ruff format check to backend CI job"
```

---

## Task 6: Add pre-commit framework for Python

**Files:**
- Create: `.pre-commit-config.yaml`
- Modify: `requirements.txt`

- [ ] **Step 1: Install pre-commit**

Run: `venv/bin/pip install pre-commit`

Expected: Package installed successfully.

- [ ] **Step 2: Add pre-commit to requirements.txt**

Add to `requirements.txt`:

```
pre-commit==4.0.0
```

- [ ] **Step 3: Write .pre-commit-config.yaml**

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.14.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
```

- [ ] **Step 4: Install the hook**

Run: `venv/bin/pre-commit install`

Expected: "pre-commit installed at .git/hooks/pre-commit"

- [ ] **Step 5: Run on all files once**

Run: `venv/bin/pre-commit run --all-files`

Expected: Runs ruff --fix and ruff-format on all Python files. May make changes.

- [ ] **Step 6: Stage any autofixes**

If step 5 modified files, review the changes and stage them:

```bash
git add -A
```

- [ ] **Step 7: Commit**

```bash
git commit -m "chore: add pre-commit framework for Python formatting and linting"
```

---

## Task 7: Expand ruff rules (I, UP, B)

**Files:**
- Create: `pyproject.toml` (or modify existing)

- [ ] **Step 1: Check if pyproject.toml or ruff.toml exists**

Run: `ls pyproject.toml ruff.toml 2>/dev/null || echo "No ruff config found"`

If neither exists, create `pyproject.toml`.

- [ ] **Step 2: Write pyproject.toml with ruff config**

Create `pyproject.toml`:

```toml
[tool.ruff]
target-version = "py312"
select = ["E", "F", "I", "UP", "B"]
ignore = ["E501"]

[tool.ruff.lint.isort]
known-first-party = ["api"]
```

- [ ] **Step 3: Run expanded ruff rules locally**

Run: `venv/bin/python -m ruff check api/`

Expected: May show new violations from `I` (import sorting), `UP` (pyupgrade), or `B` (bugbear).

- [ ] **Step 4: Fix all violations**

Most should be auto-fixable. Run:

```bash
venv/bin/python -m ruff check --fix api/
```

Then run again to see any remaining manual fixes needed.

For remaining issues:
- `I` (isort): Reorder imports manually or check if autofix missed some
- `UP` (pyupgrade): Modernize syntax (e.g., `typing.List` → `list`)
- `B` (bugbear): Fix likely bugs (e.g., mutable default args)

- [ ] **Step 5: Verify clean**

Run: `venv/bin/python -m ruff check api/`

Expected: "All checks passed!"

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "lint: expand ruff rules to include isort, pyupgrade, bugbear"
```

---

## Task 8: Add CodeQL workflow

**Files:**
- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Write CodeQL workflow**

Create `.github/workflows/codeql.yml`:

```yaml
name: "CodeQL"

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 9 * * 1'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    strategy:
      fail-fast: false
      matrix:
        language: [javascript, python]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
      - name: Autobuild
        uses: github/codeql-action/autobuild@v3
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/codeql.yml
git commit -m "ci: add CodeQL security analysis workflow"
```

---

## Task 9: Add Dependabot configuration

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Write Dependabot config**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "CYC-Think-Tank"

  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    reviewers:
      - "CYC-Think-Tank"
```

- [ ] **Step 2: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot for npm and pip dependency updates"
```

---

## Task 10: Add Security Audit workflow

**Files:**
- Create: `.github/workflows/security-audit.yml`

- [ ] **Step 1: Write security audit workflow**

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
    name: NPM Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=moderate
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/security-audit.yml
git commit -m "ci: add npm audit security check workflow"
```

---

## Task 11: CI QoL improvements

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add workflow_dispatch and schedule triggers**

In `.github/workflows/ci.yml`, replace the `on:` section:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:
  schedule:
    - cron: '0 6 * * *'
```

- [ ] **Step 2: Add concurrency group**

After the `on:` section and before `jobs:`, add:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

- [ ] **Step 3: Add format check to frontend job**

In the `frontend` job, after `npm run lint` and before `npx tsc --noEmit`, add:

```yaml
      - run: npm run format:check
```

The frontend job should now be:

```yaml
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npx tsc --noEmit
      - run: npm run build
      - run: npm test
```

- [ ] **Step 4: Add .next/ caching**

In the `frontend` job, after the `actions/setup-node` step, add:

```yaml
      - name: Cache .next build
        uses: actions/cache@v4
        with:
          path: |
            .next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
```

- [ ] **Step 5: Verify CI YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add workflow_dispatch, concurrency, caching, and format check"
```

---

## Task 12: One-Time Secret Audit

**Files:**
- None (read-only audit)

- [ ] **Step 1: Check git history for potential secrets**

Run:

```bash
git log --all --oneline --grep='password\|secret\|key\|token\|apikey\|credential'
```

Expected: Review the commits. If any contain actual secrets, rotate them immediately and consider using `git filter-repo` or BFG to remove from history.

- [ ] **Step 2: Verify .gitignore has .env***

Run: `cat .gitignore | grep '\.env'`

Expected: Should show `.env*` or similar pattern.

- [ ] **Step 3: Verify .env.local is not tracked**

Run: `git ls-files | grep '\.env'`

Expected: No output (no .env files tracked).

- [ ] **Step 4: Document findings**

If secrets found: notify team, rotate credentials, clean history.
If clean: nothing to commit. Just note in this task that audit passed.

---

## Task 13: Full Verification

- [ ] **Step 1: Run frontend lint**

Run: `npm run lint`

Expected: Passes with zero errors.

- [ ] **Step 2: Run frontend format check**

Run: `npm run format:check`

Expected: Passes (no unformatted files).

- [ ] **Step 3: Run backend ruff check**

Run: `venv/bin/python -m ruff check api/`

Expected: Passes with zero errors.

- [ ] **Step 4: Run backend ruff format check**

Run: `venv/bin/python -m ruff format --check api/`

Expected: Passes.

- [ ] **Step 5: Run backend unit tests**

Run: `venv/bin/python -m pytest tests/unit/ -v`

Expected: All 21 tests pass.

- [ ] **Step 6: Run frontend unit tests**

Run: `npm test`

Expected: All 37 tests pass.

- [ ] **Step 7: Verify pre-commit hooks**

Stage a small change to a `.tsx` and `.py` file, then try to commit:

```bash
echo "// test" >> src/app/page.tsx
git add src/app/page.tsx
git commit -m "test: verify pre-commit hooks (will be reverted)"
```

Expected: Both frontend (lint-staged) and backend (pre-commit) hooks run. If the commit succeeds, the hooks either passed or auto-fixed.

```bash
git reset --soft HEAD~1
```

- [ ] **Step 8: Commit final verification**

```bash
git commit -m "chore: Phase 2 quality & security complete - all checks passing"
```

---

## Self-Review

**1. Spec coverage:**
- [x] Prettier frontend formatting → Task 1
- [x] ruff format backend → Task 5
- [x] Husky + lint-staged pre-commit → Task 2
- [x] Python pre-commit framework → Task 6
- [x] ESLint no-unused-vars → Task 3
- [x] ESLint no-explicit-any → Task 4
- [x] ruff expanded rules (I, UP, B) → Task 7
- [x] CodeQL workflow → Task 8
- [x] Dependabot → Task 9
- [x] npm audit workflow → Task 10
- [x] CI QoL (caching, concurrency, workflow_dispatch) → Task 11
- [x] Secret audit → Task 12
- [x] Full verification → Task 13

**2. Placeholder scan:**
- [x] No "TBD", "TODO", "implement later"
- [x] No "Add appropriate error handling" without specifics
- [x] No "Write tests for the above" without test code
- [x] All steps show exact commands and expected output
- [x] All file paths are exact

**3. Type consistency:**
- [x] ESLint rule names consistent (`@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`)
- [x] ruff rule codes consistent (`I`, `UP`, `B`)
- [x] File paths consistent (`.github/workflows/`, `.husky/`)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-29-phase2-quality-security-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints.

**Which approach?**
