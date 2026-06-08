---

# 📌 `TASKS.md`

```markdown
# Survey Analytics System — Task Backlog

This file tracks implementation tasks aligned with the decision log.

---

## 🔴 HIGH PRIORITY

### TASK-001: Refactor item type assignment

Replace cardinality-based logic with metadata-driven mapping.

- Remove: unique-value heuristic
- Add: question_type → model mapping
- Ensure schema validation at ingestion layer

---

### TASK-002: Implement correct nominal item encoding

Fix single-choice questions to preserve categorical structure.

- Convert responses to categorical likelihood inputs
- Avoid numeric collapse of options
- Align with Bock NRM structure

---

### TASK-003: Implement mixed-format IRT pipeline

Enable simultaneous fitting of:

- 2PL
- GRM
- Nominal Response Model

Ensure unified latent trait space.

---

## 🟡 MEDIUM PRIORITY

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
