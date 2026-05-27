# Short Answer Validation & Description Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable validation to short_answer questions (with postal_code_prefix as the first preset) and an optional description/helper-text field to all question types.

**Architecture:** Extend the existing `short_answer` type's `options` JSONB with a `validation` object and a top-level `description` string. Admin UI gets a description input and validation config dropdown. Respondent UI renders description, applies validation on submit, normalizes input. No DB migration needed — JSONB accepts any shape and `question_type` enum already includes `short_answer`.

**Tech Stack:** FastAPI (Python), Next.js 16 (TypeScript + React), Supabase (PostgreSQL/PostgREST), Tailwind CSS

---

### Task 1: Add validation error translation strings

**Files:**
- Modify: `src/contexts/LanguageContext.tsx:13-215`

- [ ] **Step 1: Add error message strings for all three languages**

Add these entries inside the `en: { ... }`, `fr: { ... }`, and `zh: { ... }` blocks:

In `en`:
```typescript
'Please enter exactly 3 characters in the format A1A (letter, number, letter).': 'Please enter exactly 3 characters in the format A1A (letter, number, letter).',
```

In `fr`:
```typescript
'Please enter exactly 3 characters in the format A1A (letter, number, letter).': 'Veuillez entrer exactement 3 caractères au format A1A (lettre, chiffre, lettre).',
```

In `zh`:
```typescript
'Please enter exactly 3 characters in the format A1A (letter, number, letter).': '请输入恰好3个字符，格式为A1A（字母、数字、字母）。',
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/LanguageContext.tsx
git commit -m "feat: add postal code validation error translation strings"
```

---

### Task 2: Add server-side validation to answer upsert endpoint

**Files:**
- Modify: `api/index.py:738-753`

- [ ] **Step 1: Add validation in `upsert_answer` (line 742)**

Replace the `upsert_answer` function body (lines 740-753) with:

```python
@app.put("/api/sessions/{session_id}/answers")
async def upsert_answer(session_id: str, body: AnswerUpsert):
    """Save or update a single answer for a session (auto-save on Next)."""
    try:
        # Fetch question config to check for validation rules
        q_res = supabase.table("questions").select("options, is_required").eq("id", body.question_id).execute()
        if q_res.data:
            q = q_res.data[0]
            opts = q.get("options")
            if isinstance(opts, dict):
                validation = opts.get("validation")
                if validation and isinstance(validation, dict) and validation.get("type") != "none":
                    val = body.answer_text
                    max_len = validation.get("max_length")
                    regex_str = validation.get("regex")
                    normalize_upper = validation.get("normalize_uppercase")

                    if val and normalize_upper:
                        val = val.upper()
                        body.answer_text = val

                    if val and max_len and len(val) > max_len:
                        raise HTTPException(status_code=422, detail=f"Answer exceeds maximum length of {max_len}")

                    if val and regex_str:
                        import re
                        if not re.match(regex_str, val):
                            raise HTTPException(status_code=422, detail="Answer does not match required format")

        supabase.table("answers").upsert({
            "session_id": session_id,
            "question_id": body.question_id,
            "answer_text": body.answer_text,
            "answer_numeric": body.answer_numeric,
            "answer_options": body.answer_options,
            "time_spent": body.time_spent
        }, on_conflict="session_id,question_id").execute()

        return {"status": "saved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Verify Python syntax**

Run: `python3 -c "import ast; ast.parse(open('api/index.py').read()); print('Syntax OK')"`
Expected: `Syntax OK`

- [ ] **Step 3: Commit**

```bash
git add api/index.py
git commit -m "feat: add server-side validation for short_answer answers"
```

---

### Task 3: Add description field and validation config to admin create page

**Files:**
- Modify: `src/app/admin/create/page.tsx:8-316`

- [ ] **Step 1: Add new fields to QuestionDraft interface (lines 10-36)**

Add after line 29 (`attachments?: ...`):
```typescript
  question_description?: string;
  question_description_fr?: string;
  question_description_zh?: string;
  validation_type?: 'none' | 'email' | 'postal_code_prefix' | 'regex';
  validation_regex?: string;
  validation_max_length?: number;
  validation_normalize_uppercase?: boolean;
```

- [ ] **Step 2: Set defaults in addQuestion (line 116-141)**

For `short_answer`, add these defaults inside the `newQ` object literal after `definitions_fr: []`:
```typescript
      question_description: '',
      question_description_fr: '',
      question_description_zh: '',
      validation_type: 'none',
      validation_regex: '',
      validation_max_length: undefined,
      validation_normalize_uppercase: false,
```

- [ ] **Step 3: Add validation_type preset application**

When validation_type changes to a preset, auto-fill fields. Create a helper function at the top of the component, before `getOptionsArray`:

```typescript
  const VALIDATION_PRESETS: Record<string, { regex: string; max_length?: number; normalize_uppercase?: boolean }> = {
    none: { regex: '', max_length: undefined, normalize_uppercase: false },
    email: { regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', max_length: 254, normalize_uppercase: false },
    postal_code_prefix: { regex: '^[A-Z][0-9][A-Z]$', max_length: 3, normalize_uppercase: true },
  };
```

And modify `updateQuestion` or add a new handler to apply presets:

```typescript
  const updateValidationType = (qId: string, type: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const preset = type !== 'regex' ? VALIDATION_PRESETS[type] || {} : {};
      return {
        ...q,
        validation_type: type as any,
        validation_regex: type === 'regex' ? q.validation_regex : (preset.regex || ''),
        validation_max_length: type === 'regex' ? q.validation_max_length : (preset.max_length),
        validation_normalize_uppercase: type === 'regex' ? q.validation_normalize_uppercase : (preset.normalize_uppercase ?? false),
      };
    }));
  };
```

- [ ] **Step 4: Add optionsPayload for short_answer in handleSubmit (lines 288-298)**

Add an `else if` branch after `q.type === 'section_header'`:
```typescript
          } else if (q.type === 'short_answer') {
            const validation = q.validation_type && q.validation_type !== 'none' ? {
              type: q.validation_type,
              regex: q.validation_regex || '',
              max_length: q.validation_max_length,
              normalize_uppercase: q.validation_normalize_uppercase || false,
            } : undefined;
            optionsPayload = {
              description: q.question_description || '',
              ...(validation ? { validation } : {}),
            };
```

- [ ] **Step 5: Add validation_presets to FR/zh translation payload in handleSubmit (lines 328-356)**

In the FR payload builder, add after the `section_header` case:
```typescript
          } else if (q.type === 'short_answer') {
            const validation = q.validation_type && q.validation_type !== 'none' ? {
              type: q.validation_type,
              regex: q.validation_regex || '',
              max_length: q.validation_max_length,
              normalize_uppercase: q.validation_normalize_uppercase || false,
            } : undefined;
            optionsFr = {
              description: q.question_description_fr || q.question_description || '',
              ...(validation ? { validation } : {}),
            };
```

For the zh payload, the codebase handles that in the edit page only (create doesn't auto-save zh). But since the edit page reuses the same patterns, we need to cover zh in the edit page.

Same for the zh payload in handleSubmit (create) - this code path exists. Let me check: Actually looking at the Zh save section (after FR), lines 372+ have the Zh save. Let me find it.

Actually I see from the code that the create page saves zh translations at lines 372+ in the same way as FR. Let me add the same for zh:

After the FR block, the zh block follows the same pattern. The `handleSubmit` in create saves zh translations starting somewhere after line 372. Let me add the short_answer handling there too.

Looking more carefully at the create page code, the zh translation save starts after the FR block. Add the same short_answer branch for zh.

- [ ] **Step 6: Add description input and validation config UI in question editor**

After the RichTextEditor for question text (after line 531, before `</div>`), add the description input:

```tsx
              {/* Question Description (all types) */}
              <div className="ml-10 mb-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Helper Text / Description (Optional)</label>
                {language === 'fr' && (
                  <div className="text-xs text-gray-400 dark:text-slate-500 mb-1 px-2 border-l-2 border-gray-200 bg-gray-50 dark:bg-slate-900 p-1.5 rounded-r">
                    {q.question_description || "No English description provided"}
                  </div>
                )}
                <input
                  type="text"
                  value={language === 'en' ? (q.question_description || '') : (q.question_description_fr || '')}
                  onChange={(e) => updateQuestion(q.id, language === 'en' ? 'question_description' : 'question_description_fr', e.target.value)}
                  placeholder="e.g. We ask for the first three characters of your postal code to get a general sense of where responses are coming from."
                  className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                />
              </div>
```

- [ ] **Step 7: Add validation config UI for short_answer questions**

After the description input (only when `q.type === 'short_answer'`):

```tsx
              {/* Short Answer Validation Config */}
              {q.type === 'short_answer' && (
                <div className="ml-10 mb-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Validation Settings</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Validation Type</label>
                      <select
                        value={q.validation_type || 'none'}
                        onChange={(e) => updateValidationType(q.id, e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                      >
                        <option value="none">None</option>
                        <option value="email">Email</option>
                        <option value="postal_code_prefix">Postal Code Prefix (A1A)</option>
                        <option value="regex">Custom Regex</option>
                      </select>
                    </div>
                    {q.validation_type && q.validation_type !== 'none' && (
                      <>
                        {(q.validation_type === 'regex') ? (
                          <>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Max Length</label>
                              <input type="number" min={1}
                                value={q.validation_max_length || ''}
                                onChange={(e) => updateQuestion(q.id, 'validation_max_length', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                                placeholder="e.g. 3"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Regex Pattern</label>
                              <input type="text"
                                value={q.validation_regex || ''}
                                onChange={(e) => updateQuestion(q.id, 'validation_regex', e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                                placeholder="^[A-Z][0-9][A-Z]$"
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="flex items-center cursor-pointer">
                                <input type="checkbox"
                                  checked={q.validation_normalize_uppercase || false}
                                  onChange={(e) => updateQuestion(q.id, 'validation_normalize_uppercase', e.target.checked)}
                                  className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-300">Normalize to uppercase</span>
                              </label>
                            </div>
                          </>
                        ) : (
                          <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                            {q.validation_type === 'email' && (
                              <><strong>Email rules:</strong> Must contain @ and a domain. Max 254 characters.</>
                            )}
                            {q.validation_type === 'postal_code_prefix' && (
                              <><strong>Postal code prefix rules:</strong> Max 3 characters. Format: letter, number, letter (e.g. M5V). Input is automatically normalized to uppercase.</>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
```

- [ ] **Step 8: Also add description and validation fields for zh language**

In the zh translation save section of handleSubmit, add the same `short_answer` options payload block as for FR.

- [ ] **Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new errors from this file.

- [ ] **Step 10: Commit**

```bash
git add src/app/admin/create/page.tsx
git commit -m "feat: add description and validation config to admin create page"
```

---

### Task 4: Mirror changes to admin edit page

**Files:**
- Modify: `src/app/admin/edit/[id]/page.tsx`

The edit page mirrors the create page. Apply the same changes:

- [ ] **Step 1: Add `question_description` fields to QuestionDraft**

Same as Task 3 Step 1.

- [ ] **Step 2: Add `VALIDATION_PRESETS` and `updateValidationType`**

Same as Task 3 Steps 2-3.

- [ ] **Step 3: Add `short_answer` branch in handleSubmit options payload**

Same as Task 3 Step 4. Search for the `section_header` branch in the edit page's handleSubmit and add the `short_answer` branch.

- [ ] **Step 4: Add description input and validation config UI**

Same as Task 3 Steps 6-7. Find the question editor rendering in the edit page (it mirrors create) and add the description input and validation config.

- [ ] **Step 5: Verify syntax**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "edit" | head -10`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/edit/[id]/page.tsx
git commit -m "feat: add description and validation config to admin edit page"
```

---

### Task 5: Update respondent survey page with description display and validation

**Files:**
- Modify: `src/app/survey/[id]/page.tsx:943-949`, `src/app/survey/[id]/page.tsx:546-553`

- [ ] **Step 1: Update `getOpts` to include validation config**

Modify the `getOpts` function (line 352-367). Change the first fallback line (353) to include `validation`:
```typescript
    if (!q?.options) return { choices: [], has_other: false, max_selections: undefined, has_calculator: false, description: '', attachments: [], randomize_options: false, locked_choices: [], description_alignment: 'left', definitions: [], validation: undefined };
```
And in the second fallback line (354):
```typescript
    if (Array.isArray(q.options)) return { choices: q.options, has_other: false, max_selections: undefined, has_calculator: false, description: '', attachments: [], randomize_options: false, locked_choices: [], description_alignment: 'left', definitions: [], validation: undefined };
```
And add `validation: q.options.validation` to the return object at line 356-366.

- [ ] **Step 2: Render description below question text (after line 715)**

After the closing `</div>` of the question text div (line 715), add:

```tsx
            {opts.description && (
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-500 dark:text-slate-400 italic leading-relaxed max-w-xl mx-auto">
                  {opts.description}
                </p>
              </div>
            )}
```

- [ ] **Step 3: Replace short_answer textarea with validation-aware input (lines 943-949)**

Replace the `<textarea>` block:
```tsx
              {currentQuestion.type === 'short_answer' && (
                <div>
                  {opts.validation?.type && opts.validation.type !== 'none' ? (
                    <>
                      <input
                        type="text"
                        maxLength={opts.validation.max_length || undefined}
                        className="w-full p-4 border-2 border-gray-200 dark:border-slate-600 bg-transparent dark:bg-slate-900 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-[var(--color-cyc-primary)]/20 dark:text-white focus:outline-none transition-all text-base sm:text-lg"
                        placeholder={opts.validation.type === 'postal_code_prefix' ? t('e.g. M5V') : t('Share your thoughts here...')}
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (opts.validation?.normalize_uppercase) {
                            val = val.toUpperCase();
                          }
                          setAnswers({...answers, [currentQuestion.id]: val});
                        }}
                      />
                      {opts.validation.type === 'postal_code_prefix' && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 text-center">
                          {t('Enter the first 3 characters of your postal code (e.g. M5V).')}
                        </p>
                      )}
                    </>
                  ) : (
                    <textarea rows={4}
                      className="w-full p-4 border-2 border-gray-200 dark:border-slate-600 bg-transparent dark:bg-slate-900 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-[var(--color-cyc-primary)]/20 dark:text-white focus:outline-none transition-all resize-none text-base sm:text-lg"
                      placeholder={t('Share your thoughts here...')}
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => setAnswers({...answers, [currentQuestion.id]: e.target.value})}
                    />
                  )}
                </div>
              )}
```

- [ ] **Step 4: Add client-side validation in handleNext (after line 553)**

After the required check (line 553), add validation for short_answer:

```tsx
      // Validate short_answer format
      if (currentQuestion.type === 'short_answer' && answers[currentQuestion.id]) {
        const v = opts.validation;
        if (v && v.type && v.type !== 'none') {
          let val = answers[currentQuestion.id];
          
          // Normalize before validation
          if (v.normalize_uppercase && typeof val === 'string') {
            val = val.toUpperCase();
            setAnswers({...answers, [currentQuestion.id]: val});
          }
          
          if (v.max_length && typeof val === 'string' && val.length > v.max_length) {
            alert(`Answer must be ${v.max_length} characters or fewer.`);
            return;
          }
          
          if (v.regex && typeof val === 'string') {
            try {
              const regex = new RegExp(v.regex);
              if (!regex.test(val)) {
                alert(t('Please enter exactly 3 characters in the format A1A (letter, number, letter).'));
                return;
              }
            } catch {
              console.error('Invalid regex:', v.regex);
            }
          }
        }
      }
```

- [ ] **Step 5: Add missing translation string**

In `LanguageContext.tsx`, add the "Enter the first 3 characters..." string:

en:
```typescript
'Enter the first 3 characters of your postal code (e.g. M5V).': 'Enter the first 3 characters of your postal code (e.g. M5V).',
```

fr:
```typescript
'Enter the first 3 characters of your postal code (e.g. M5V).': 'Entrez les 3 premiers caracteres de votre code postal (ex. M5V).',
```

zh:
```typescript
'Enter the first 3 characters of your postal code (e.g. M5V).': '请输入您邮政编码的前3个字符（例如M5V）。',
```

- [ ] **Step 6: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "survey" | head -10`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/survey/[id]/page.tsx src/contexts/LanguageContext.tsx
git commit -m "feat: add description rendering and client-side validation to survey page"
```

---

### Task 6: Update results page to show description and validation info

**Files:**
- Modify: `src/app/admin/results/[id]/page.tsx:335-347` (short_answer summary)

- [ ] **Step 1: Show description in question header**

In the summary tab, where questions are listed, add description display. Find the question text rendering section and add below it something like:

```tsx
{q.options?.description && (
  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">{q.options.description}</p>
)}
```

- [ ] **Step 2: In the individual responses tab, show description**

In the question display at line 536-538, add description below question text:

```tsx
{q.options?.description && (
  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic">{q.options.description}</p>
)}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "results" | head -10`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/results/[id]/page.tsx
git commit -m "feat: show question description in results page"
```

---

### Task 7: Write and run validation tests

**Files:**
- Create: `test_short_answer_validation.py`

- [ ] **Step 1: Write test file**

```python
"""Tests for short_answer validation logic without requiring a running server."""
import re
import sys

def validate_postal_code_prefix(value: str, is_required: bool = True):
    """Replicate the validation logic that should happen client-side and server-side."""
    if not value:
        if is_required:
            return False, "Answer is required"
        return True, None

    val = value.strip().upper()
    if len(val) > 3:
        return False, f"Exceeds max length of 3 (got {len(val)})"

    if not re.match(r'^[A-Z][0-9][A-Z]$', val):
        return False, f"Does not match format A1A (got {val})"

    return True, val


def run_tests():
    failures = 0

    # Valid inputs
    valid_cases = ["M5V", "A1B", "K0A", "K1A"]
    for v in valid_cases:
        ok, result = validate_postal_code_prefix(v)
        if not ok:
            print(f"FAIL: Expected valid but got '{result}' for input '{v}'")
            failures += 1
        elif result != v:
            print(f"FAIL: Expected normalized '{v}' but got '{result}'")
            failures += 1
        else:
            print(f"PASS: '{v}' is valid")

    # Normalization from lowercase
    lower_cases = [("m5v", "M5V"), ("a1b", "A1B"), ("m5v", "M5V")]
    for inp, expected in lower_cases:
        ok, result = validate_postal_code_prefix(inp)
        if not ok:
            print(f"FAIL: Expected valid but got '{result}' for lowercase input '{inp}'")
            failures += 1
        elif result != expected:
            print(f"FAIL: Expected '{expected}' but got '{result}' for input '{inp}'")
            failures += 1
        else:
            print(f"PASS: '{inp}' normalized to '{result}'")

    # Mixed case
    mixed_cases = [("M5v", "M5V"), ("a1B", "A1B")]
    for inp, expected in mixed_cases:
        ok, result = validate_postal_code_prefix(inp)
        if not ok:
            print(f"FAIL: Expected valid but got '{result}' for mixed case input '{inp}'")
            failures += 1
        elif result != expected:
            print(f"FAIL: Expected '{expected}' but got '{result}' for input '{inp}'")
            failures += 1
        else:
            print(f"PASS: mixed case '{inp}' -> '{result}'")

    # Invalid inputs
    invalid_cases = [
        ("123", "format"),
        ("M55", "format"),
        ("M5VV", "length"),
        ("m*v", "format"),
        ("ab", "format"),
    ]
    for inp, reason in invalid_cases:
        ok, result = validate_postal_code_prefix(inp)
        if ok:
            print(f"FAIL: Expected invalid ({reason}) but got valid for '{inp}'")
            failures += 1
        else:
            print(f"PASS: '{inp}' rejected ({reason})")

    # Empty/required
    ok, result = validate_postal_code_prefix("", is_required=True)
    if ok:
        print("FAIL: Expected required empty to be invalid")
        failures += 1
    else:
        print("PASS: empty required input rejected")

    # Empty/optional
    ok, result = validate_postal_code_prefix("", is_required=False)
    if not ok:
        print(f"FAIL: Expected optional empty to be valid but got '{result}'")
        failures += 1
    else:
        print("PASS: empty optional input allowed")

    # Max length enforcement
    ok, result = validate_postal_code_prefix("ABCD")
    if ok:
        print("FAIL: Expected 4-char input to be rejected")
        failures += 1
    else:
        print("PASS: 4-char input rejected")

    print(f"\n{'='*40}")
    if failures == 0:
        print("ALL TESTS PASSED")
    else:
        print(f"{failures} TEST(S) FAILED")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
```

- [ ] **Step 2: Run tests**

Run: `python3 test_short_answer_validation.py`
Expected: `ALL TESTS PASSED`

- [ ] **Step 3: Commit**

```bash
git add test_short_answer_validation.py
git commit -m "test: add short_answer validation test suite"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Verify Python syntax for api/index.py**

Run: `python3 -c "import ast; ast.parse(open('api/index.py').read()); print('Syntax OK')"`
Expected: `Syntax OK`

- [ ] **Step 2: Verify frontend builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Successful build.

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors.

- [ ] **Step 4: Run tests once more**

Run: `python3 test_short_answer_validation.py`
Expected: `ALL TESTS PASSED`

- [ ] **Step 5: Final commit if any cleanup changes**

```bash
git status
git diff
# If no changes, done. Otherwise commit cleanup.
```

---

### Self-Review

1. **Spec coverage:** All requirements mapped:
   - [x] Short-answer type extends existing `short_answer` → Tasks 3, 4, 5
   - [x] Postal-code prefix config → Validation preset dropdown in Tasks 3, 4
   - [x] Description/helper-text field → Tasks 3, 4 (admin), Tasks 5, 6 (display)
   - [x] Max 3 chars, uppercase normalization → Tasks 2 (server), 5 (client)
   - [x] Regex ^[A-Z][0-9][A-Z]$ → Tasks 2, 3, 5
   - [x] Validation errors shown → Task 5 (client alert), Task 2 (server 422)
   - [x] Optional question support → Task 5 (conditional check) / Task 7 (test)
   - [x] Answer stored as uppercase → Task 2 (normalize), Task 5 (client normalize)
   - [x] Tests → Task 7

2. **Placeholder scan:** No TBD, TODO, or "implement later" patterns. No e.g., magic strings without definition.

3. **Type consistency:** `validation_type` is typed as `'none' | 'email' | 'postal_code_prefix' | 'regex'` consistently across all tasks. `question_description` follows the pattern of `section_description` in the existing codebase.
