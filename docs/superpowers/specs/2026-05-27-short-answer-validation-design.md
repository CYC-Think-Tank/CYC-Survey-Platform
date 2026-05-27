# Short Answer Validation & Description Field

**Date:** 2026-05-27
**Status:** Designing

## Goal

Enable configurable short-answer validation and an optional description/helper-text field for survey questions. The immediate use case is a postal code prefix demographic question, but the implementation supports generic validation presets extensible to future needs.

## Background

The platform already has a `short_answer` question type backed by a `<textarea>` input. It stores answers in `answer_text` with no validation beyond optional required-field checks. The `options` JSONB column on questions stores per-type configuration (choices, randomize, logic gates, etc.). This design extends that pattern.

## Data Model

### `options` JSONB — new fields

```jsonc
{
  // Existing fields (varies by question type)
  "choices": [...],
  "has_other": false,
  // ...

  // NEW: available on ALL question types
  "description": "We ask for the first three characters of your postal code...",

  // NEW: only for short_answer type
  "validation": {
    "type": "none" | "email" | "postal_code_prefix" | "regex",
    "regex": "^[A-Z][0-9][A-Z]$",
    "max_length": 3,
    "normalize_uppercase": true
  }
}
```

### Validation type presets

| Type | max_length | regex | normalize_uppercase |
|---|---|---|---|
| `none` | (unset) | (unset) | false |
| `email` | 254 | `^[^\s@]+@[^\s@]+\.[^\s@]+$` | false |
| `postal_code_prefix` | 3 | `^[A-Z][0-9][A-Z]$` | true |
| `regex` | (admin-set) | (admin-set) | (admin-set) |

When an admin selects a preset, the UI auto-fills fields; only `regex` type exposes manual fields.

### No database migration needed

- `question_type` enum already includes `short_answer`
- `options` column is JSONB — accepts any shape
- `answers.answer_text` stores the validated value

## Files to Modify

| File | Changes |
|---|---|
| `api/index.py` | Validate answer on upsert (`PUT /api/sessions/{id}/answers`); include `description` in question JSON; summary endpoint: group short_answer responses with validation type shown |
| `src/app/admin/create/page.tsx` | Add `description` field in question editor; add validation config UI for short_answer; pass `description` and `validation` in payload |
| `src/app/admin/edit/[id]/page.tsx` | Same as create |
| `src/app/survey/[id]/page.tsx` | Render `description` below question text; render `<input maxLength={...}>` for short_answer; normalize to uppercase before submit; show inline validation errors |
| `src/app/admin/results/[id]/page.tsx` | Show `description` in summary view if present |
| `src/contexts/LanguageContext.tsx` | Add validation error strings (en/fr/zh) |
| `db_scripts/schema.sql` | No changes (optional: note `short_answer` in comment) |

## Respondent UI Flow (postal_code_prefix)

1. Question renders with `description` in smaller, muted text below the question
2. `<input type="text" maxLength={3}>` — browser-native length cap blocks excess
3. On step advance: value is trimmed, normalized to uppercase, validated against `^[A-Z][0-9][A-Z]$`
4. If validation fails: inline red error message, user stays on step
5. If validation passes: answer saved to `answer_text` via existing `PUT /api/sessions/{id}/answers`
6. If optional and empty: skips validation, saves empty or null

## Admin UI (Create/Edit)

- **Description field**: a second text input (or textarea) below the question text editor, labeled "Helper Text / Description", with smaller font styling
- **Validation config** (short_answer only): dropdown with "None", "Email", "Postal Code Prefix (A1A)", "Custom Regex". Selecting a preset shows a read-only summary of rules. "Custom Regex" reveals manual fields: max_length, regex input, normalize toggle.

## Testing

New file: `test_short_answer_validation.py`

Tests covering:
- Valid postal codes: `M5V`, `A1B`, `K0A`
- Normalization: lowercase `m5v` → stored as `M5V`, mixed `M5v` → `M5V`
- Invalid: `123`, `M55`, `M5VV`, `m*v`, empty string on required
- Max length: input longer than 3 chars rejected (browser blocks + server validates)
- Optional question: empty input allowed for non-required
- Description round-trip: create survey with description → fetch → description present
- Validation config round-trip: create with postal_code_prefix → fetch → config preserved

## Out of Scope

- CSV/Excel export (no export feature exists yet)
- Validation presets beyond email and postal code prefix
- Server-side i18n for validation error messages (client-side only)
- Realtime validation (on keystroke) — only on submit/advance
