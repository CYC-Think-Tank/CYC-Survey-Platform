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

## [06.25.2026]

## Decision #15

**STATUS: ACTIVE**

Run latent trait model fitting as an asynchronous backend job rather than a blocking HTTP request.

**Reason:**

- Mixed-format MIRT fitting can take longer than a normal proxied request should remain open
- Prevents frontend proxy socket resets and long-running page spinners
- Allows the UI to show explicit running, complete, and error states
- Keeps the frontend unaware of R implementation details

Implementation:

- User opens the Traits tab
- Frontend calls the latent trait API endpoint
- API matches the survey to its config by `survey_id`
- If fitted output exists, return it
- If no fitted output exists, start `general_script.r` in a background job
- Return `running` status immediately
- Frontend polls the same endpoint until fitted JSON is available or the job fails

---

## [06.25.2026]

## Decision #16

**STATUS: ACTIVE**

Cap each survey's fitted latent trait model at three traits and compile config-derived simple-structure `mirt` syntax.

**Reason:**

- Four or more latent dimensions substantially increases MIRT runtime and convergence risk
- The config already defines the intended question-to-trait assignment
- Passing only `model <- num_thetas` discards that assignment and can fit a broader model than intended
- Compiled model syntax preserves config-driven architecture while avoiding manual hardcoding in the R script
- The same compiler can later consume learned or reinforcement-learning-derived question-to-trait mappings

Implementation:

- Preserve the config JSON files as the current source of truth for trait assignments
- Use at most the first three configured traits for the current mirt fit
- Compile the selected config mapping into simple-structure `mirt` syntax
- Allow each modeled item to load only on its assigned latent trait
- Continue excluding ranking items from the mirt fit

---

## [06.25.2026]

## Decision #17

**STATUS: ACTIVE**

Visualize latent trait distributions as histograms of respondent theta values rather than mean-position sliders.

**Reason:**

- A slider overemphasizes the mean and hides distribution shape
- Theta estimates are respondent-level outputs, so the frontend should show their spread directly
- Histograms make skew, clustering, and dispersion easier to inspect
- The API should pass per-dimension theta values alongside summary statistics

Implementation:

- Include theta values for each fitted latent trait in the latent trait API response
- Render compact per-trait histograms in the Results Traits tab
- Keep summary metrics such as mean, median, standard deviation, standard error, reliability, and N

---

## [06.28.2026]

## Decision #18

**STATUS: ACTIVE**

Drop latent trait model items with fewer than two observed response categories before fitting with `mirt`.

**Reason:**

- `mirt` cannot estimate items that are constant across observed responses
- Checkbox options are expanded into binary items, and rare options can become all-zero or all-one columns
- Keeping those columns causes the full latent trait fit to fail even when the rest of the survey is estimable
- Filtering non-estimable items is an in-memory modeling cleanup and does not modify survey responses or database records

Implementation:

- Count distinct non-missing response categories for each modeled item after pivoting to the analysis matrix
- Exclude items with fewer than two observed categories
- Log the excluded item ids for auditability
- Re-align `item_metadata`, `item_types`, and compiled `mirt` syntax to the retained columns
- Stop with a clear error only if no estimable items remain

---

## [06.28.2026]

## Decision #19

**STATUS: ACTIVE**

Harden latent trait result and job-status file paths against path traversal using UUID validation and path containment checks.

**Reason:**

- CodeQL flagged user-controlled `survey_id` values flowing into local JSON file paths
- The latent trait API reads, writes, and deletes local cache artifacts under `api/latent_trait_outputs`
- Survey ids are UUIDs in the current data model and config files
- Path hardening should be scoped to the latent trait cache route and should not alter the `ai_analyses` pipeline

Implementation:

- Normalize latent trait route survey ids as UUID strings before lookup or path construction
- Validate config `survey_id` values as UUIDs
- Build fitted-result and job-status paths through a helper that resolves the target path and confirms it remains directly inside the intended cache directory
- Leave AI Insights routes and the `ai_analyses` database cache unchanged

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

---

## [06.28.2026]

## Decision #20

**STATUS: EXPERIMENTAL**

Use sparse predictive models as an explanation layer on top of MIRT latent traits.

**Reason:**

* MIRT estimates latent constructs but does not explicitly rank the contribution of individual survey questions.
* Ridge regression provides a stable measure of each question's contribution while accounting for highly correlated survey items.
* Lasso regression identifies a sparse subset of questions capable of approximating each latent trait.
* The predictive layer complements the measurement model rather than replacing it.

Implementation:

* Fit the MIRT model first to estimate respondent-level theta scores.
* For each latent trait, fit Ridge and Lasso models using survey responses as predictors and the corresponding theta values as targets.
* Return ranked question importance rather than modifying the latent trait estimates themselves.
* Treat the predictive models as an interpretability and survey optimization layer.

---

## [06.28.2026]

## Decision #21

**STATUS: ACTIVE**

Abstract latent trait mappings behind a mapping provider rather than coupling downstream models directly to configuration files.

**Reason:**

* Current latent trait definitions originate from manually maintained JSON configuration files.
* Future work may infer trait mappings through clustering or other automated approaches.
* Downstream models should depend only on a normalized mapping interface rather than the source of the mapping.

Implementation:

* Represent latent trait mappings internally as:

```
trait_id → list(question_ids)
```

* Allow the mapping provider to be backed by:

  * JSON configuration files (current)
  * Learned clustering models (future)
  * Other automated mapping methods
* Ensure Ridge, Lasso, and frontend APIs consume the normalized mapping rather than reading configuration files directly.

---

## [06.28.2026]

## Decision #22

**STATUS: ACTIVE**

Serve Ridge/Lasso question contribution rankings inside the existing latent traits API response.

**Reason:**

* The Traits tab should make one request to `/api/surveys/{survey_id}/latent-traits`.
* Ridge and Lasso are an explanation layer for fitted theta scores, not a replacement for the MIRT model.
* The frontend should render predictive model output without knowing how mappings are sourced or models are fit.
* The explanation layer must remain read-only with respect to survey response data.

Implementation:

* Add respondent and modeled-item metadata to the R latent trait JSON artifact so Python can align response features to theta values.
* Build a normalized mapping provider backed by JSON configs for now, with a stable `trait_id -> list(question_ids)` interface.
* Fit Ridge and Lasso models in a backend service after a MIRT fit is available.
* Aggregate item-level coefficients back to question-level contribution rankings, including checkbox option items.
* Attach the resulting `predictiveModels` object to the existing latent traits response.

---

## [06.28.2026]

## Decision #23

**STATUS: ACTIVE**

Chunk and paginate Ridge/Lasso Supabase answer reads to avoid PostgREST URI-length and row-limit failures.

**Reason:**

* Large surveys can have hundreds or thousands of respondent ids.
* Passing all respondent ids into a single `.in_("session_id", respondent_ids)` filter creates a very long PostgREST URL.
* Build Canada Strong surfaced this as a `414 URI too long` error in the Top Contributing Questions section.
* Even after avoiding the URL-length limit, answer reads can exceed Supabase's default row limit unless paginated.

Implementation:

* Keep predictive model database access read-only.
* Fetch questions once for the configured question ids.
* Fetch answers in small respondent-id chunks.
* Page each answer chunk with `.range(...)` until fewer than one page of rows is returned.
* Preserve the existing single frontend request and backend `predictiveModels` response shape.

---

## [06.28.2026]

## Decision #24

**STATUS: REVERSED**

Require explicit Postgres credentials for production R latent trait fits and filter the R SQL query by survey id.

**Reason:**

* The FastAPI/Supabase client can point at production while `general_script.r` still defaults to local Postgres.
* This can regenerate a latent trait artifact from the development database even when the UI is displaying production survey counts.
* The R pipeline needs direct Postgres credentials for now because it uses `RPostgres`, not the Supabase REST client.
* Loading all valid responses before filtering by config survey id is inefficient and too broad for production runs.

Implementation:

* Support `LATENT_TRAIT_DATABASE_URL`, `DATABASE_URL`, `POSTGRES_URL`, or the component `LATENT_TRAIT_DB_*` variables for R database access.
* Keep the local Postgres defaults for local-only runs.
* When `SUPABASE_URL` points to a remote Supabase project, fail fast unless explicit R Postgres credentials are configured.
* Preload the selected latent trait config when the API provides `LATENT_TRAIT_CONFIG_PATH` or `LATENT_TRAIT_SURVEY_ID`.
* Bind the selected `survey_id` into the R SQL query so only that survey's valid responses are read.
* Keep the R pipeline read-only against the database.

Reversal:

* Direct R-to-Postgres production access requires a database password that may not be available to the application maintainer.
* Maintaining separate Python Supabase credentials and R Postgres credentials creates avoidable operational friction.
* This approach was replaced by Decision #25.

---

## [06.28.2026]

## Decision #25

**STATUS: ACTIVE**

Use Python-managed Supabase extraction for latent trait fits and pass a prepared JSON dataset to R.

**Reason:**

* The existing FastAPI layer already has working Supabase access through `SUPABASE_URL` and `SUPABASE_KEY`.
* R should not require separate production Postgres credentials just to fit latent traits.
* Keeping database access in Python avoids the need to locate or reset the Supabase database password.
* R remains responsible for psychometric fitting, while Python owns API orchestration and data access.

Implementation:

* Fetch valid response sessions, questions, and answers in Python using read-only Supabase `select` calls.
* Serialize rows with the same column shape previously returned by the R SQL query.
* Pass the prepared dataset path to R through `LATENT_TRAIT_INPUT_PATH`.
* Remove direct R Postgres access from `general_script.r`.
* Keep the selected-survey and selected-config safeguards before fitting.
* Preserve the single frontend request to `/api/surveys/{survey_id}/latent-traits`.

---

## [06.28.2026]

## Decision #26

**STATUS: ACTIVE**

Drop underidentified latent traits after ranking and non-estimable item filtering.

**Reason:**

* Ranking items are excluded from the current `mirt` fit under Decision #14.
* Some configured traits can become too weakly identified after ranking items and constant items are removed.
* Build Canada Strong's `government performance` trait has too few non-ranking estimable items after filtering and can destabilize the latent trait covariance matrix.
* Dropping underidentified traits is preferable to failing the entire survey fit when the remaining traits are still useful.

Implementation:

* Require each fitted latent trait to have at least three estimable non-ranking items by default.
* Configure this threshold with `LATENT_TRAIT_MIN_ITEMS_PER_DIMENSION`.
* Log excluded underidentified trait names before fitting.
* Continue preserving ranking responses for future Plackett-Luce modeling.
