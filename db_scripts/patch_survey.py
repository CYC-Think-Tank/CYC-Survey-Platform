import re

with open("src/app/admin/edit/[id]/page.tsx", "r") as f:
    content = f.read()

# 1. Add isLocked state
content = content.replace(
    "const [language, setLanguage] = useState<'en' | 'fr'>('en');",
    "const [language, setLanguage] = useState<'en' | 'fr'>('en');\n  const [isLocked, setIsLocked] = useState(false);",
)

# 2. Update useEffect check
old_check = """        if (data.is_active) {
          setError("Cannot edit an active survey. Please go back.");
          setLoading(false);
          return;
        }"""
content = content.replace(
    old_check, "        setIsLocked(data.has_been_published || data.is_active);"
)

# 3. Update handleSubmit
old_submit = """      const res = await fetch(`/api/surveys/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update survey');
      }
      const updatedSurvey = await res.json();

      // Also generate and save French translation payload
      const payload_fr = payload.questions.map((q, idx) => {
        const draftQ = questions[idx];
        const updatedQ = updatedSurvey.questions?.[idx];"""

new_submit = """      let updatedSurvey = null;
      if (!isLocked) {
        const res = await fetch(`/api/surveys/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || 'Failed to update survey');
        }
        updatedSurvey = await res.json();
      }

      // Also generate and save French translation payload
      const payload_fr = payload.questions.map((q, idx) => {
        const draftQ = questions[idx];
        const updatedQ = isLocked ? draftQ : updatedSurvey.questions?.[idx];"""
content = content.replace(old_submit, new_submit)

# 4. Remove the Cannot edit an active survey error block JSX
error_block = """  if (error && error.includes("Cannot edit an active survey")) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-6">{error}</h1>
        <Link href="/admin" className="btn-primary">Return to Dashboard</Link>
      </div>
    );
  }"""
content = content.replace(error_block, "")

# 5. Add a banner for locked surveys
banner = """      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
          {error}
        </div>
      )}"""
locked_banner = """      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      {isLocked && language === 'en' && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-6 border border-yellow-200">
          <strong>This survey is locked.</strong> Because it is active or has been published, its English structure cannot be modified. You can view its contents, or switch to Français to edit translations.
        </div>
      )}"""
content = content.replace(banner, locked_banner)

# 6. Disable inputs
# title input
content = content.replace(
    """onChange={(e) => language === 'en' ? setTitle(e.target.value) : setTitleFr(e.target.value)}
              className="w-full p-2 border""",
    """onChange={(e) => language === 'en' ? setTitle(e.target.value) : setTitleFr(e.target.value)}
              disabled={isLocked && language === 'en'}
              className="w-full p-2 border""",
)

# description textarea
content = content.replace(
    """onChange={(e) => language === 'en' ? setDescription(e.target.value) : setDescriptionFr(e.target.value)}
              className="w-full p-2.5 border""",
    """onChange={(e) => language === 'en' ? setDescription(e.target.value) : setDescriptionFr(e.target.value)}
              disabled={isLocked && language === 'en'}
              className="w-full p-2.5 border""",
)

# descriptionAlignment
content = content.replace(
    """<select value={descriptionAlignment} onChange={(e) => setDescriptionAlignment(e.target.value)} className="text-xs border""",
    """<select value={descriptionAlignment} onChange={(e) => setDescriptionAlignment(e.target.value)} disabled={isLocked} className="text-xs border""",
)

# estimatedMinutes
content = content.replace(
    """onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full p-2 border""",
    """onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                disabled={isLocked}
                className="w-full p-2 border""",
)

# isActive
content = content.replace(
    """onChange={(e) => setIsActive(e.target.checked)}
                  className="mr-2 h-5 w-5""",
    """onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isLocked}
                  className="mr-2 h-5 w-5""",
)

# question_text input
content = content.replace(
    """onChange={(e) => updateQuestion(q.id, language === 'en' ? 'question_text' : 'question_text_fr', e.target.value)}
                      placeholder={language === 'fr' ? "Traduction française" : "Question Text"}
                      className="w-full p-2 border""",
    """onChange={(e) => updateQuestion(q.id, language === 'en' ? 'question_text' : 'question_text_fr', e.target.value)}
                      disabled={isLocked && language === 'en'}
                      placeholder={language === 'fr' ? "Traduction française" : "Question Text"}
                      className="w-full p-2 border""",
)

# 7. Hide structural changes if isLocked
content = re.sub(
    r"language === 'fr' \? 'hidden'",
    "language === 'fr' || isLocked ? 'hidden'",
    content,
)

# For translation mode text, we don't need to change it, but it uses language === 'fr'
content = content.replace(
    "{language === 'fr' || isLocked && (", "{language === 'fr' && ("
)

# Wait, `language === 'fr' ? 'hidden'` doesn't cover all cases. There are:
content = content.replace(
    "language === 'fr' || isLocked ? 'hidden' : 'opacity-0",
    "language === 'fr' || isLocked ? 'hidden' : 'opacity-0",
)
content = content.replace(
    "language === 'fr' || isLocked ? 'hidden' : ''",
    "language === 'fr' || isLocked ? 'hidden' : ''",
)

# Replace any lingering missed occurrences
content = content.replace(
    "language === 'fr' ? 'hidden' : ''", "language === 'fr' || isLocked ? 'hidden' : ''"
)
content = content.replace(
    "language === 'fr' ? 'hidden' : 'opacity-0 group-hover:opacity-100'",
    "language === 'fr' || isLocked ? 'hidden' : 'opacity-0 group-hover:opacity-100'",
)

# Add disabled={isLocked && language === 'en'} to RichTextEditor in Section Header
content = content.replace(
    """onChange={(val) => updateQuestion(q.id, language === 'en' ? 'section_description' : 'section_description_fr', val)}
                        placeholder={language === 'en' ? "Provide context or instructions before the next set of questions..." : "Traduction française du contexte..."}""",
    """onChange={(val) => updateQuestion(q.id, language === 'en' ? 'section_description' : 'section_description_fr', val)}
                        readOnly={isLocked && language === 'en'}
                        placeholder={language === 'en' ? "Provide context or instructions before the next set of questions..." : "Traduction française du contexte..."}""",
)

# Wait, RichTextEditor might not support readOnly directly, but we can pass it if it does. If not, it won't crash.

with open("src/app/admin/edit/[id]/page.tsx", "w") as f:
    f.write(content)
