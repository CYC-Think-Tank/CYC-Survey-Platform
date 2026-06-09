---

# 📌 `TASKS.md`

```markdown
# Survey Analytics System — Task Backlog

This file tracks implementation tasks aligned with the decision log.

---

## 🔴 HIGH PRIORITY

### TASK-001: Increase efficiency of current code by vectorization

Investigate whether the current code can be made more efficient through vectorizing the bottlenecks analysis data or other slow parts

- Check which parts of the code are causing slowness
- Implement changes for efficiency by vectorization or other appropriate techniques
- Ensure core functionality remains unchanged

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
