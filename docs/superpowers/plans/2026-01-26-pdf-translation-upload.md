# PDF Translation Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to upload a PDF of translated survey questions and auto-populate the translation fields on the edit page.

**Architecture:** New `POST /api/surveys/{survey_id}/translation/upload` endpoint accepts PDF + language, extracts text with pdfplumber, sends to Gemini for structured JSON extraction, maps to question UUIDs by position, upserts to `ai_analyses`. Frontend adds an upload button in the translation-mode banner on the edit page.

**Tech Stack:** Python FastAPI (existing), pdfplumber (new dep), Google Gemini API (existing), Next.js (existing)

---

### Task 1: Add pdfplumber dependency

**Files:**
- Modify: `api/requirements.txt`

- [ ] **Step 1: Add pdfplumber to requirements**

Open `api/requirements.txt` and confirm the line `pdfplumber` exists. If not present, add it:

```text
pdfplumber
```

- [ ] **Step 2: Verify pdfplumber is installed**

Run: `source venv/bin/activate && pip install pdfplumber`
Expected: Already installed or installs successfully.

- [ ] **Step 3: Commit**

```bash
git add api/requirements.txt && git commit -m "chore: add pdfplumber dependency"
```

---

### Task 2: Add PDF translation upload backend endpoint

**Files:**
- Modify: `api/index.py`

- [ ] **Step 1: Add imports at the top of the file**

At line 13 (after `import math`), add:

```python
import pdfplumber
import httpx
import json as json_module
```

Add the Gemini model constant after line 14 (`app = FastAPI(...)`), before line 18 (`app.add_middleware(...)`):

```python
GEMINI_MODEL = "gemini-3.5-flash"
```

- [ ] **Step 2: Add the upload endpoint**

Insert the following code after line 356 (after the `update_survey_translation` function's closing `raise HTTPException`):

```python
@app.post("/api/surveys/{survey_id}/translation/upload")
async def upload_translation_pdf(survey_id: str, language: str = "fr", file: UploadFile = File(...)):
    """Upload a PDF containing translated survey questions and auto-populate translations."""
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    if language not in ('fr', 'zh'):
        raise HTTPException(status_code=400, detail="Language must be 'fr' or 'zh'")
    
    try:
        # Read file content
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")
        
        # Fetch survey and questions from DB
        survey_res = supabase.table("surveys").select("*").eq("id", survey_id).execute()
        if not survey_res.data:
            raise HTTPException(status_code=404, detail="Survey not found")
        survey = survey_res.data[0]
        
        questions_res = supabase.table("questions").select("*").eq("survey_id", survey_id).order("order_index").execute()
        questions = questions_res.data
        
        if not questions:
            raise HTTPException(status_code=400, detail="Survey has no questions")
        
        # Extract PDF text
        extracted_text = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
        
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Build reference: flat list of questions with their English text
        reference_questions = []
        for i, q in enumerate(questions):
            ref = {
                "index": i,
                "type": q["type"],
                "question_text": q["question_text"],
            }
            if q["options"] and isinstance(q["options"], dict):
                opts = q["options"]
                if "choices" in opts:
                    ref["options"] = {"choices": opts["choices"]}
                    ref["option_count"] = len(opts["choices"])
                elif "description" in opts:
                    ref["options"] = {"description": opts["description"]}
            reference_questions.append(ref)
        
        language_name = "French" if language == "fr" else "Chinese"
        
        prompt = f"""You are an expert translator. Below is a survey with its English questions, followed by {language_name} translations extracted from a PDF.

=== SURVEY REFERENCE (English) ===
Title: {survey['title']}
Description: {survey.get('description', '')}

Questions (in exact order, with index):
{json_module.dumps(reference_questions, indent=2, ensure_ascii=False)}

=== PDF TEXT ({language_name} Translation) ===
{extracted_text}

=== INSTRUCTIONS ===
The PDF contains {language_name} translations of the survey. Map each translated question to its corresponding English question by position (index). The PDF questions appear in the exact same order as the reference.

For each question:
- Extract the translated question text (may contain HTML like <strong>, <em>)
- Extract translated choice options if the question has choices
- For section_header types, extract the translated section title and description if present
- If a question has no visible translation in the PDF, set question_text to an empty string

IMPORTANT: Do NOT skip any questions from the reference. Every question must appear in the output, with the same index ordering.

Return a JSON object matching EXACTLY this structure:
{{
  "title": "{language_name} survey title",
  "description": "{language_name} survey description or empty string",
  "questions": [
    {{
      "index": 0,
      "question_text": "translated question text",
      "type": "multiple_choice",
      "options": {{ "choices": ["Option 1", "Option 2"] }}
    }},
    ...
  ]
}}

For questions without choices (short_answer, rating_scale, likert_scale), set options to null.
For section_header, set options to {{}}.
The "questions" array MUST contain exactly {len(questions)} items, one per reference question in order.
Return ONLY the JSON object, no markdown wrapping or extra text."""

        # Call Gemini
        GOOGLE_AI_KEY = os.environ.get("GOOGLE_AI_KEY")
        if not GOOGLE_AI_KEY:
            raise HTTPException(status_code=500, detail="Google AI API key not configured")
        
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GOOGLE_AI_KEY}"
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            gemini_res = await client.post(gemini_url, json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json"
                }
            })
        
        if gemini_res.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Gemini API error: {gemini_res.status_code} - {gemini_res.text[:500]}")
        
        gemini_data = gemini_res.json()
        raw_text = gemini_data["candidates"][0]["content"]["parts"][0]["text"]
        
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        
        parsed = json_module.loads(cleaned)
        
        # Validate structure
        if "questions" not in parsed:
            raise HTTPException(status_code=502, detail="Could not parse translations from PDF — missing questions in AI response")
        
        # Map translations to question UUIDs by index
        questions_translated = []
        gemini_questions = {q["index"]: q for q in parsed["questions"]}
        
        for i, q in enumerate(questions):
            gemini_q = gemini_questions.get(i)
            if gemini_q:
                translated = {
                    "id": q["id"],
                    "question_text": gemini_q.get("question_text", ""),
                    "type": q["type"],
                    "order_index": q["order_index"],
                    "is_required": q.get("is_required", True),
                    "is_conditional": q.get("is_conditional", False),
                    "options": gemini_q.get("options"),
                }
            else:
                translated = {
                    "id": q["id"],
                    "question_text": q["question_text"],
                    "type": q["type"],
                    "order_index": q["order_index"],
                    "is_required": q.get("is_required", True),
                    "is_conditional": q.get("is_conditional", False),
                    "options": q.get("options"),
                }
            questions_translated.append(translated)
        
        # Build payload for ai_analyses
        title_key = f"title_{language}"
        description_key = f"description_{language}"
        questions_key = f"questions_{language}"
        analysis_type = f"translation_{language}"
        
        payload = {
            questions_key: questions_translated,
            title_key: parsed.get("title", "") or "",
            description_key: parsed.get("description", "") or "",
        }
        
        # Upsert to ai_analyses
        existing = supabase.table("ai_analyses").select("id").eq("survey_id", survey_id).eq("analysis_type", analysis_type).execute()
        if existing.data:
            supabase.table("ai_analyses").update({
                "data": payload,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("ai_analyses").insert({
                "survey_id": survey_id,
                "analysis_type": analysis_type,
                "data": payload,
                "updated_at": datetime.utcnow().isoformat()
            }).execute()
        
        return {"success": True, "data": payload}
        
    except HTTPException:
        raise
    except json_module.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 3: Remove duplicate imports from AI section**

Lines 985-988 currently contain:

```python
import httpx
import json as json_module

GEMINI_MODEL = "gemini-3.5-flash"
```

Remove these four lines since they are now at the top of the file.

- [ ] **Step 4: Verify the endpoint doesn't break the API**

Run: `source venv/bin/activate && python -c "from api.index import app; print('Import OK')"`
Expected: `Import OK`

- [ ] **Step 5: Commit**

```bash
git add api/index.py && git commit -m "feat: add PDF translation upload endpoint"
```

---

### Task 3: Add upload UI to admin edit page

**Files:**
- Modify: `src/app/admin/edit/[id]/page.tsx`

- [ ] **Step 1: Add Upload icon import**

At line 4, `Upload` is already imported from lucide-react, so no change needed.

- [ ] **Step 2: Add state variables for upload**

After line 58 (`const [language, setLanguage] = useState<'en' | 'fr' | 'zh'>('en');`), add:

```typescript
const [translationUploading, setTranslationUploading] = useState(false);
const [translationUploadError, setTranslationUploadError] = useState('');
const [translationUploadSuccess, setTranslationUploadSuccess] = useState('');
```

- [ ] **Step 3: Add the upload handler function**

After line 59 (`const [isLocked, setIsLocked] = useState(false);`), add:

```typescript
const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setTranslationUploadError('Please select a PDF file');
      return;
    }
    
    setTranslationUploading(true);
    setTranslationUploadError('');
    setTranslationUploadSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/surveys/${params.id}/translation/upload?language=${language}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }
      
      const result = await res.json();
      
      // Re-fetch translations and populate fields
      const transRes = await fetch(`/api/surveys/${params.id}/translation`);
      if (transRes.ok) {
        const transData = await transRes.json();
        
        if (language === 'fr') {
          setTitleFr(transData.title_fr || '');
          setDescriptionFr(transData.description_fr || '');
          setQuestions(prev => prev.map((q, idx) => {
            const translated = transData.questions_fr?.[idx];
            if (!translated) return q;
            return {
              ...q,
              question_text_fr: translated.question_text || '',
              options_fr: translated.options?.choices || null,
              section_description_fr: translated.options?.description || '',
            };
          }));
        } else if (language === 'zh') {
          setTitleZh(transData.title_zh || '');
          setDescriptionZh(transData.description_zh || '');
          setQuestions(prev => prev.map((q, idx) => {
            const translated = transData.questions_zh?.[idx];
            if (!translated) return q;
            return {
              ...q,
              question_text_zh: translated.question_text || '',
              options_zh: translated.options?.choices || null,
              section_description_zh: translated.options?.description || '',
            };
          }));
        }
      }
      
      setTranslationUploadSuccess(`Translations loaded from PDF — review and save to confirm`);
      
      // Clear the file input
      e.target.value = '';
    } catch (err: any) {
      setTranslationUploadError(err.message || 'Failed to parse PDF');
    } finally {
      setTranslationUploading(false);
    }
  };
```

- [ ] **Step 4: Add the upload UI in the translation mode banner**

Replace the translation mode banner (lines 660-664):

```tsx
{language !== 'en' && (
  <div className="bg-blue-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm flex items-start">
    <FileText className="w-5 h-5 mr-2 flex-shrink-0" />
    <p><strong>Translation Mode:</strong> Structural changes (adding/deleting questions or options) are disabled while translating. Switch back to English to modify the survey structure.</p>
  </div>
)}
```

With:

```tsx
{language !== 'en' && (
  <div className="bg-blue-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm">
    <div className="flex items-start">
      <FileText className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p><strong>Translation Mode:</strong> Structural changes (adding/deleting questions or options) are disabled while translating. Switch back to English to modify the survey structure.</p>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-3">
      <label className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${translationUploading ? 'bg-blue-200 dark:bg-blue-800 text-blue-400 dark:text-blue-300 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600 border border-blue-200 dark:border-blue-700'}`}>
        <Upload className="w-4 h-4 mr-1.5" />
        {translationUploading ? 'Parsing...' : 'Upload PDF'}
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handlePdfUpload}
          disabled={translationUploading}
        />
      </label>
      {translationUploadSuccess && (
        <span className="text-green-600 dark:text-green-400">{translationUploadSuccess}</span>
      )}
      {translationUploadError && (
        <span className="text-red-600 dark:text-red-400">{translationUploadError}</span>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd /Users/rsxing/CYC-Survey-Platform && npx next build 2>&1 | tail -20`
Expected: Build succeeds without errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/edit/[id]/page.tsx && git commit -m "feat: add PDF upload button to admin edit translation mode"
```

---

### Task 4: End-to-end testing

**Files:**
- Test: manual testing with `Full Survey Questions.pdf`

- [ ] **Step 1: Start the backend API**

Run: `source venv/bin/activate && cd api && uvicorn index:app --reload --port 8000`
Keep this running in a separate terminal window.

- [ ] **Step 2: Test the endpoint with curl**

Find a valid survey ID to test against. If the "Bâtir un Canada fort" survey exists in the database, use its ID. Otherwise, create or identify a test survey.

Run: `curl -X POST "http://localhost:8000/api/surveys/{VALID_SURVEY_ID}/translation/upload?language=fr" -F "file=@/Users/rsxing/CYC-Survey-Platform/Full Survey Questions.pdf"`

Expected: Returns `{"success": true, "data": {...}}` with translated questions.

- [ ] **Step 3: Verify translations were saved**

Run: `curl "http://localhost:8000/api/surveys/{VALID_SURVEY_ID}/translation"`

Expected: Returns `questions_fr` array with translated content matching the PDF.

- [ ] **Step 4: Test error cases**

Test invalid file type:
`curl -X POST "http://localhost:8000/api/surveys/{VALID_SURVEY_ID}/translation/upload?language=fr" -F "file=@/Users/rsxing/CYC-Survey-Platform/api/index.py"`
Expected: 400 error "Only PDF files are accepted"

Test invalid language:
`curl -X POST "http://localhost:8000/api/surveys/{VALID_SURVEY_ID}/translation/upload?language=de" -F "file=@/Users/rsxing/CYC-Survey-Platform/Full Survey Questions.pdf"`
Expected: 400 error "Language must be 'fr' or 'zh'"

Test non-existent survey:
`curl -X POST "http://localhost:8000/api/surveys/00000000-0000-0000-0000-000000000000/translation/upload?language=fr" -F "file=@/Users/rsxing/CYC-Survey-Platform/Full Survey Questions.pdf"`
Expected: 404 error "Survey not found"

- [ ] **Step 5: Commit (if any fixes made)**

```bash
git add -A && git commit -m "test: verify PDF translation upload endpoint"
```
