# PDF Translation Upload — Design Spec

## 1. Problem

The survey platform supports English, French, and Chinese via a language toggle. UI chrome strings are translated, but survey content (questions, options, titles, descriptions) must currently be manually typed into the admin edit page's translation fields. This is tedious for large surveys. Admins want to upload a PDF of pre-translated questions and have the system auto-populate the translation fields.

## 2. Architecture

### 2.1 New API Endpoint

**`POST /api/surveys/{survey_id}/translation/upload`**

Accepts:
- Multipart form: `file` (PDF, max 10MB) + `language` (`fr` | `zh`)

Flow:
1. Validate file is a PDF
2. Read the survey's full structure from DB (all questions with English text, types, options counts, and `order_index`)
3. Extract PDF text with pdfplumber (raw text, all pages)
4. Send the prompt + survey context + PDF text to Gemini API for structured extraction
5. Validate the Gemini JSON response against expected schema
6. Map `sections[].questions[].index` to actual question UUIDs by section+position
7. Save to `ai_analyses` table with `analysis_type = translation_{language}`, same format as existing translations
8. Return the structured translation as JSON

### 2.2 Gemini Prompt Strategy

The prompt includes:
- The survey's English questions as a reference table (index, type, question_text, option count)
- The raw PDF text
- Instructions to return a strict JSON schema

Required response schema:

```json
{
  "title": "French survey title",
  "description": "French survey description",
  "sections": [
    {
      "section_title": "English section header text to match on",
      "questions": [
        {
          "index": 0,
          "question_text": "Translated question (HTML allowed)",
          "options": { "choices": ["A", "B"], ... } | null | {}
        }
      ]
    }
  ]
}
```

- `index`: 0-based position within the section, used to map by `order_index`
- `options`: Same polymorphic shape as the DB `questions.options` column — `{choices: [...]}` for MC/checkboxes/dropdown/ranking, `{}` for rating/likert, `null` for short_answer. Includes `has_other` where applicable.
- `section_title`: The English section header text, used to match against `section_header` questions in the DB

### 2.3 Authentication

The upload endpoint requires admin authentication (same as all `/api/surveys` mutation endpoints — no additional auth needed beyond the existing pattern).

### 2.4 Frontend Change (Admin Edit Page)

**File:** `src/app/admin/edit/[id]/page.tsx`

In the translation-mode blue info banner (visible when `language !== 'en'`), add an upload button:

```
[Translation Mode: Structural changes are disabled. Switch back to English to modify the survey structure.]
[Upload PDF ▼]
```

- Click opens a small file picker / drop zone
- On file select: POST to `/api/surveys/{id}/translation/upload`
- Loading: spinner + "Parsing translations..."
- Success: refresh the page (translation state fields get populated from the API response or a re-fetch), green toast "Translations loaded from PDF — review and save to confirm"
- Error: red toast with error message, upload stays for retry

The upload button is only visible when NOT in English mode.

## 3. Error Handling

| Scenario | Behavior |
|----------|----------|
| Non-PDF file | 400 error, "Only PDF files are accepted" |
| File >10MB | 413 error, "File too large (max 10MB)" |
| Gemini API failure | 502 error, "Translation service unavailable — retry later" |
| Invalid Gemini JSON response | 502 error, "Could not parse translations from PDF — check PDF format" |
| Mismatched question count | Questions beyond the survey's count are ignored; missing questions remain empty |
| Unmatched section titles | Questions under unmatched sections are returned under `unmatched` key in the response for admin review |
| No survey found | 404 error |

## 4. Data Flow

```
Admin selects PDF → POST /api/surveys/{id}/translation/upload
  → Backend: read DB survey + questions
  → Backend: extract PDF text (pdfplumber)
  → Backend: send to Gemini with prompt
  → Backend: validate JSON schema
  → Backend: map indices → question UUIDs
  → Backend: upsert ai_analyses (analysis_type = translation_{lang})
  → Return structured translation to frontend
  → Frontend: re-fetch translation, populate fields, show success toast
  → Admin reviews and clicks Save (existing PUT /api/surveys/{id}/translation)
```

Note: The PDF upload endpoint saves directly to `ai_analyses`. On success, the frontend re-fetches translations via the existing `GET /api/surveys/{id}/translation` and populates the edit fields. The admin sees pre-populated fields and clicks Save to finalize (this PUTs any edits they made; if no edits, it's a no-op overwrite of the same data).

## 5. Dependencies

- `pdfplumber` (Python) — already installed in venv for this spec
- Google Gemini API — already configured (`api/index.py` uses `genai` SDK)
- No new frontend dependencies needed
- No database schema changes needed (uses existing `ai_analyses` table)

## 6. Testing

- Upload the provided `Full Survey Questions.pdf` against its matching survey and verify all 26 questions populate correctly
- Test with a mismatched PDF (different survey) and verify graceful error
- Test with an invalid file (non-PDF) and verify 400 response
- Test with a PDF that has extra/missing questions and verify partial mapping works
