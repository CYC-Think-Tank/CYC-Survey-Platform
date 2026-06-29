---

# 📌 `TASKS.md`

```markdown
# Survey Analytics System — Task Backlog

This file tracks implementation tasks aligned with the decision log.

---

## 🔴 HIGH PRIORITY

### TASK-001: Implement Ridge/Lasso latent trait explanation layer

Business objective:

Provide an interpretable explanation of which survey questions contribute most strongly to each latent trait estimated by the MIRT pipeline.

Files to create:

* `api/services/ridge_lasso_service.py`
* `api/routes/predictive_models.py` (or integrate into latent trait routes)

Files to modify:

* Frontend latent trait tab
* Existing latent trait API models
* Shared model schemas

Backend implementation:

* Reuse the existing response preprocessing pipeline.
* Use MIRT theta scores as regression targets.
* For each latent trait:

  * Build feature matrix from modeled survey responses.
  * Fit Ridge regression.
  * Fit Lasso regression.
  * Rank questions by contribution.
* Return a frontend-ready JSON object containing:

  * latent trait id
  * model type
  * ranked questions
  * contribution scores
  * model quality metrics (R², RMSE, etc.)

Frontend implementation:

* Add a "Top Contributing Questions" component beneath each latent trait.
* The parent latent trait page should issue a single API request.
* Dynamically render one contribution component per latent trait.
* Each component displays:

  * top five contributing questions
  * contribution percentages/scores
  * positive/negative contribution direction (optional)

Architecture constraints:

* Frontend must not trigger one regression job per component.
* Backend performs all model fitting in one request and returns results for every latent trait.
* Keep predictive models independent of frontend rendering logic.
* Preserve compatibility with future cluster-based latent trait mappings.


### TASK-002: Debug Ridge and Lasso implementation

- Investigate the cause of `{'message': 'JSON could not be generated', 'code': 414, 'hint': 'Refer to full message for details', 'details': "b'URI too long\\n'"}` error message for Top Contributing Questions section of Build Canada Strong Questionnaire
- Implement fixes to address this bug 

### TASK-004: Stabilize EM convergence

Investigate convergence issues in current mirt pipeline.

- Check item mis-specification
- Increase iteration stability
- Validate identifiability conditions

---

### TASK-005: Add likelihood computation layer

Expose full log-likelihood for model diagnostics.

- Enable model comparison
- Support debugging and validation
- Store per-iteration likelihood trace

---

## 🟡 MEDIUM PRIORITY

### TASK-006: Investigate separate ranking model pipeline

Investigate fitting ranking items separately using a Plackett–Luce model.

- Fit ranking items outside mirt
- Use Plackett–Luce likelihood for ordered responses
- Build custom estimation pipeline to combine IRT likelihood with ranking likelihood

---

### TASK-009: Implement Python-managed latent trait data extraction for R

Replace direct R database access with a Python-managed extraction layer.

- Use the existing Supabase client / API credentials as the single source of database connectivity
- Fetch survey responses in Python through read-only, paginated queries
- Serialize a prepared analysis dataset for `general_script.r`
- Keep R responsible for psychometric fitting while removing the need for separate R Postgres credentials
- Preserve the existing config-driven mapping provider and future learned-mapping compatibility
- Pass the prepared dataset to R through `LATENT_TRAIT_INPUT_PATH`
- Keep production database access read-only through Supabase `select` calls

---

## 🟢 LOW PRIORITY

### TASK-007: Prototype embedding-based model (experimental)

Evaluate hybrid statistical + embedding system.

- Must preserve reproducibility constraints
- Must store parameter snapshots

---

## 🧠 INFRASTRUCTURE

### TASK-008: Create Codex-compatible project memory system

Implement structured memory files:

- PROJECT.md
- DECISIONS.md
- TASKS.md

Ensure ingestion by agent runtime.
