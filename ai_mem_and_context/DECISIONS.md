# Survey Analytics System — Decision Log

This document contains the canonical architectural decisions governing the survey modeling system.

---

## [06.08.2026]

## Decision #1

**STATUS: ACTIVE**

Add explicit statistical models to data analysis pipeline rather than only having LLM-based latent inference.

**Reason:**

- Ensures statistical auditability
- Enables reproducible inference
- Preserves likelihood-based modeling structure

---

## [06.08.2026]

## Decision #2

**STATUS: ACTIVE**

Use IRT as the core measurement framework.

**Reason:**

- Provides interpretable latent traits (θ)
- Supports uncertainty quantification
- Well-established psychometric foundation

---

## [06.08.2026]

## Decision #3

**STATUS: ACTIVE**

Use response-type-specific models rather than forcing a single unified response model.

**Reason:**

- Different response types imply different likelihood functions
- Prevents model mis-specification
- Improves convergence stability

---

## [06.08.2026]

## Decision #4

**STATUS: ACTIVE**

Adopt a mixed-format IRT system.

**Reason:**

- Surveys contain heterogeneous item types
- Each type maps to a distinct likelihood model
- Maintains unified latent trait structure

Mapping:

- Binary → 2PL / Rasch
- Ordinal → GRM
- Nominal → Bock NRM

---

## [06.08.2026]

## Decision #5

**STATUS: ACTIVE**

Use metadata as the source of truth for item modeling.

**Reason:**

- Prevents misclassification from data artifacts
- Ensures reproducibility
- Aligns modeling assumptions with survey design

---

## [06.08.2026]

## Decision #6

**STATUS: ACTIVE**

Treat single-choice preference questions as nominal response items.

**Reason:**

- Categories are unordered
- Represent utility competition rather than thresholds
- GRM assumptions are invalid

---

## [06.08.2026]

## Decision #7

**STATUS: ACTIVE**

Use Bock’s Nominal Response Model for unordered categorical items.

**Reason:**

- Fully consistent with IRT likelihood framework
- Preserves interpretability of θ
- Supports statistical inference and SE estimation

---

## [06.08.2026]

## Decision #8

**STATUS: ACTIVE**

Adopt latent utility theory as the unifying framework for all response models.

**Reason:**

- Unifies GRM, NRM, and ranking models
- Provides consistent interpretation of responses
- Bridges psychometrics and choice modeling

---

## [06.08.2026]

## Decision #9

**STATUS: ACTIVE**

Treat GRM as a special case of latent utility thresholding.

**Reason:**

- GRM = utility + threshold discretization
- Not all items are ordinal
- General utility framework is more expressive

---

## [06.08.2026]

## Decision #10

**STATUS: EXPERIMENTAL**

Investigate Plackett–Luce models for ranking-based survey extensions.

**Reason:**

- Models full preference orderings
- Strong connection to latent utility theory
- Increases information density per question

---

## [06.08.2026]

## Decision #11

**STATUS: EXPERIMENTAL**

Explore embedding-based preference models in parallel with IRT.

**Reason:**

- Enables scalable representation learning
- Must preserve auditability constraints
- Potential hybrid with statistical models

---

## [06.08.2026]

## Decision #12

**STATUS: ACTIVE**

Maintain likelihood-based evaluation as a system-wide requirement.

**Reason:**

- Enables formal model comparison
- Ensures statistical rigor
- Provides consistent evaluation metric across models

---

## [06.08.2026]

## Decision #13

**STATUS: ACTIVE**

Support multidimensional latent traits instead of a single θ.

**Reason:**

- Survey constructs are inherently multidimensional
- Improves interpretability across domains
- Aligns with MIRT structure

Dimensions:

- econ
- housing

---

## [06.08.2026]

## Decision #14

**STATUS: ACTIVE**

Exclude ranking items from the current mirt-based IRT fit.

**Reason:**

- mirt does not natively support Plackett–Luce ranking likelihoods
- Prevents ranking items from being misfit as ordinal or nominal items
- Preserves current mixed-format IRT pipeline while ranking modeling is developed separately

Implementation:

- Detect ranking items from metadata
- Preserve ranking responses for future Plackett–Luce modeling
- Exclude ranking items before calling mirt

---

## System-Level Concept

```text
Latent Utility Framework

Binary Items   → 2PL
Ordinal Items   → GRM
Nominal Items   → Bock NRM
Ranking Items   → Plackett–Luce (experimental)

All observations are projections of latent utility structure.
```
