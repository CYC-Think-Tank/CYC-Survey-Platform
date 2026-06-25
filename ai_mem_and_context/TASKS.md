---

# 📌 `TASKS.md`

```markdown
# Survey Analytics System — Task Backlog

This file tracks implementation tasks aligned with the decision log.

---

## 🔴 HIGH PRIORITY

### TASK-001: Create routing connection between latent trait R analysis and frontend calls

- First, summarize the intended architecture and implementation plan, then ask for permission before making code changes.
- Model the backend route structure after `api/routes/ai_insights.py`.
- Create a new file under `api/routes/` called `latent_trait_insights.py`.

Files to change:

- general_script.r
- (to be created) api/routes/latent_trait_insights.py

Architecture direction:

- Use FastAPI/Python as the orchestration layer.
- Python should determine the relevant `survey_id`.
- Python should locate, load, and validate the correct JSON config file for that survey.
- Do **not** hardcode the config path inside `general_script.r`.
- Refactor `general_script.r` so the main analysis logic can accept a config object or serialized JSON config passed in from Python.
- R should focus only on statistical processing/model fitting, not on deciding where config files live.

Backend tasks:

- Identify the frontend API requests needed to fetch latent trait insight data.
- Identify the JSON response structure needed to dynamically populate frontend displays across different surveys and different theta dimensions.
- Add API endpoints in `latent_trait_insights.py` that:
  - receive a `survey_id`
  - select/load the matching JSON config
  - call `general_script.r`
  - pass the config into R dynamically
  - collect the R output
  - format and return frontend-ready JSON

R refactor tasks:

- Convert `general_script.r` from a one-off script into a reusable analysis function or callable script entry point.
- Replace hardcoded config loading such as:
  `jsonlite::fromJSON("api/question_topic_configs/build_canada_strong_config.json", simplifyVector = FALSE)`
  with a function parameter or command-line argument.
- Ensure theta extraction is dynamic based on the dimensions in the passed config.
- Exclude or disable hardcoded visualization logic for now, since frontend charts will be generated from JSON data rather than `ggplot2` images.
- Write code in the R file to do unit tests to make sure it still works locally

Expected output:

- The API should return structured JSON containing survey id, dimension names, theta scores, standard errors, model metadata, and any summary statistics needed by the frontend.
- The frontend should receive data, not static R visualizations.

### TASK-002: modify frontend visualization to include cards that display histogram visualizations of each theta

-

### TASK-003:

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
