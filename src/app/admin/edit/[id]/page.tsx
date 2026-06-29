'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Trash2,
  ArrowLeft,
  Save,
  Upload,
  FileText,
  Image as ImageIcon,
  Lock,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';
import { RichTextEditor } from '@/components/RichTextEditor';
import {
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  TRANSLATE_TARGET_LANGUAGES,
} from '@/config/languages';
import { SURVEY_CATEGORIES } from '@/config/categories';
import { useCollaborativeSurvey } from '@/hooks/useCollaborativeSurvey';
import type { QuestionRecord } from '@/lib/collab/surveyDoc';
import { PresenceBar } from '@/components/collab/PresenceBar';

type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'rating_scale'
  | 'checkboxes'
  | 'likert_scale'
  | 'dropdown'
  | 'section_header'
  | 'ranking';

interface QuestionDraft {
  id: string;
  question_text: string;
  type: QuestionType;
  options: unknown; // will normalize to array in state
  max_selections?: number;
  has_other?: boolean;
  randomize_options?: boolean;
  locked_choices?: string[];
  is_required: boolean;
  is_conditional: boolean;
  logic_gates?: { question_id: string; condition_type: string; value: string }[];
  logic_gate_match_type?: 'all' | 'any';
  section_description?: string;
  description_alignment?: 'left' | 'center' | 'justify';
  attachments?: { url: string; name: string; type: string }[];
  reference_number?: number;
  definitions?: { term: string; definition: string }[];
  question_text_fr?: string;
  options_fr?: unknown;
  section_description_fr?: string;
  definitions_fr?: { term: string; definition: string }[];
  question_text_zh?: string;
  options_zh?: unknown;
  section_description_zh?: string;
  definitions_zh?: { term: string; definition: string }[];
  translations?: Record<
    string,
    {
      question_text?: string;
      options?: string[];
      section_description?: string;
      question_description?: string;
      definitions?: { term: string; definition: string }[];
    }
  >;
  question_description?: string;
  question_description_fr?: string;
  question_description_zh?: string;
  validation_type?: 'none' | 'email' | 'postal_code_prefix' | 'regex';
  validation_regex?: string;
  validation_max_length?: number;
  validation_normalize_uppercase?: boolean;
}

interface ApiQuestion {
  id: string;
  question_text: string;
  type: QuestionType;
  options: unknown;
  is_required: boolean;
  is_conditional?: boolean;
}

interface ApiTranslationQuestion {
  id: string;
  question_text?: string;
  options?: unknown;
}

interface OptionsPayload {
  choices?: unknown;
  has_other?: boolean;
  randomize_options?: boolean;
  locked_choices?: string[];
  max_selections?: number;
  has_calculator?: boolean;
  description?: string;
  attachments?: { url: string; name: string; type: string }[];
  description_alignment?: string;
  validation?: {
    type: string;
    regex: string;
    max_length?: number;
    normalize_uppercase?: boolean;
  };
  definitions?: { term: string; definition: string }[];
  logic_gates?: { question_id: string; condition_type: string; value: string }[];
  logic_gate_match_type?: 'all' | 'any';
}

const VALIDATION_PRESETS: Record<
  string,
  { regex: string; max_length?: number; normalize_uppercase?: boolean }
> = {
  none: { regex: '', max_length: undefined, normalize_uppercase: false },
  email: { regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', max_length: 254, normalize_uppercase: false },
  postal_code_prefix: { regex: '^[A-Z][0-9][A-Z]$', max_length: 3, normalize_uppercase: true },
};

export default function EditSurvey() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [translationsMeta, setTranslationsMeta] = useState<
    Record<string, { title: string; description: string }>
  >({});
  const [descriptionAlignment, setDescriptionAlignment] = useState('left');
  const [estimatedMinutes, setEstimatedMinutes] = useState(5);
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [language, setLanguage] = useState<string>('en');
  const [enabledLangs, setEnabledLangs] = useState<Set<string>>(new Set(['en', 'fr', 'zh']));
  const [isLocked, setIsLocked] = useState(false);
  const [translationUploading, setTranslationUploading] = useState(false);
  const [translationUploadError, setTranslationUploadError] = useState('');
  const [translationUploadSuccess, setTranslationUploadSuccess] = useState('');
  const [translateAllLoading, setTranslateAllLoading] = useState(false);
  const [translateAllError, setTranslateAllError] = useState('');
  const [translateAllSuccess, setTranslateAllSuccess] = useState('');
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [translateApiKey, setTranslateApiKey] = useState('');
  const [translateProvider, setTranslateProvider] = useState<'opencode' | 'openrouter' | 'gemini'>(
    'opencode'
  );

  // Phase 5: real-time collaboration. Enabled only for editable (unlocked)
  // surveys; mirrors the English title/description/category/time and the
  // questions list into a shared Yjs document synced over Supabase Realtime.
  const collab = useCollaborativeSurvey({
    surveyId: typeof params.id === 'string' ? params.id : undefined,
    enabled: !loading && !isLocked,
    ready: !loading,
    title,
    setTitle,
    category,
    setCategory,
    estimatedMinutes,
    setEstimatedMinutes,
    descriptionAlignment,
    setDescriptionAlignment,
    questions: questions as unknown as QuestionRecord[],
    setQuestions: (qs) => setQuestions(qs as unknown as QuestionDraft[]),
  });

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

      const isDev = process.env.NODE_ENV === 'development';
      const baseUrl = isDev ? 'http://localhost:8000' : '';
      const url = `${baseUrl}/api/surveys/${params.id}/translation/upload?language=${language}`;

      let res: Response | null = null;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000);
        res = await fetch(url, { method: 'POST', body: formData, signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (fetchErr: unknown) {
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          setTranslationUploadError(
            'Upload timed out after 3 minutes — the server may still be processing. Try refreshing the page to see if translations were saved.'
          );
        } else {
          setTranslationUploadError(
            `Connection lost — the server may still be processing. Try refreshing the page to see if translations were saved.`
          );
        }
        setTranslationUploading(false);
        e.target.value = '';
        return;
      }

      if (res && !res.ok) {
        const text = await res.text();
        let errMsg = `Upload failed (HTTP ${res.status})`;
        try {
          const err = JSON.parse(text);
          errMsg = err.detail || errMsg;
        } catch {
          errMsg += ' — ' + (text?.substring(0, 200) || res.statusText || '');
        }
        throw new Error(errMsg);
      }

      if (res) {
        await res.json();
      }

      await populateTranslations();
      setTranslationUploadSuccess('Translations loaded from PDF — review and save to confirm');
    } catch (err: unknown) {
      setTranslationUploadError(err instanceof Error ? err.message : 'Failed to parse PDF');
    } finally {
      setTranslationUploading(false);
      e.target.value = '';
    }
  };

  const populateTranslations = async () => {
    const transRes = await fetch(`/api/surveys/${params.id}/translation`);
    if (!transRes.ok) return;
    const transData = await transRes.json();

    if (language === 'en') return;

    for (const lang of SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en')) {
      const titleKey = `title_${lang.code}`;
      const descKey = `description_${lang.code}`;
      if (transData[titleKey] && transData[titleKey].trim())
        setTransMeta(lang.code, 'title', transData[titleKey]);
      if (transData[descKey] && transData[descKey].trim())
        setTransMeta(lang.code, 'description', transData[descKey]);
    }

    const langQuestions = transData[`questions_${language}`];
    if (!langQuestions) return;

    setQuestions((prev) =>
      prev.map((q, idx) => {
        const translated = langQuestions[idx];
        if (!translated) return q;
        const trans: Record<string, unknown> = {};
        if (translated.question_text && translated.question_text.trim())
          trans.question_text = translated.question_text;
        if (
          translated.options &&
          (translated.options as Record<string, unknown>).choices !== undefined
        )
          trans.options = (translated.options as Record<string, unknown>).choices;
        if (
          translated.options &&
          (translated.options as Record<string, unknown>).description !== undefined &&
          ((translated.options as Record<string, unknown>).description as string).trim()
        )
          trans.section_description = (translated.options as Record<string, unknown>)
            .description as string;
        if (translated.options && (translated.options as Record<string, unknown>).definitions)
          trans.definitions = (translated.options as Record<string, unknown>).definitions;
        if (Object.keys(trans).length === 0) return q;
        return {
          ...q,
          translations: { ...q.translations, [language]: trans },
        };
      })
    );
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/surveys/${params.id}`).then((res) => {
        if (!res.ok) throw new Error('Survey not found');
        return res.json();
      }),
      fetch(`/api/surveys/${params.id}/translation`).then((res) =>
        res.ok ? res.json() : { questions_fr: null }
      ),
    ])
      .then(([data, transData]) => {
        setIsLocked(data.has_been_published || data.is_active);
        setTitle(data.title);
        setDescription(data.description || '');
        setDescriptionAlignment(data.description_alignment || 'left');
        setEstimatedMinutes(data.estimated_minutes);
        setCategory(data.category || '');
        setIsActive(data.is_active);
        setThumbnailUrl(data.thumbnail_url || '');
        const loaded = data.enabled_languages;
        if (loaded && loaded.length > 0) {
          setEnabledLangs(new Set(loaded));
        } else {
          setEnabledLangs(new Set(SUPPORTED_LANGUAGES.map((l) => l.code)));
        }

        const metaMap: Record<string, { title: string; description: string }> = {};
        for (const lang of SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en')) {
          const titleKey = `title_${lang.code}`;
          const descKey = `description_${lang.code}`;
          if (transData?.[titleKey] || transData?.[descKey]) {
            metaMap[lang.code] = {
              title: transData?.[titleKey] || '',
              description: transData?.[descKey] || '',
            };
          }
        }
        setTranslationsMeta(metaMap);

        const translationsByLang: Record<string, Record<string, unknown>[]> = {};
        for (const lang of SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en')) {
          const langQuestions = transData[`questions_${lang.code}`] || [];
          if (langQuestions.length > 0) {
            translationsByLang[lang.code] = langQuestions;
          }
        }

        const loadedQuestions = (data.questions as ApiQuestion[]).map((q) => {
          const isArr = !q.options || Array.isArray(q.options);
          const qOpts = q.options as Record<string, unknown>;

          const translations: Record<string, Record<string, unknown>> = {};
          for (const [langCode, langQuestions] of Object.entries(translationsByLang)) {
            const tq = (langQuestions as unknown as ApiTranslationQuestion[]).find(
              (fq) => fq.id === q.id
            );
            if (!tq) continue;
            const tIsArr = !tq?.options || Array.isArray(tq.options);
            const trans: Record<string, unknown> = {};
            if (tq.question_text) trans.question_text = tq.question_text;
            if (tq.options) {
              trans.options = tIsArr
                ? tq.options
                : (tq.options as Record<string, unknown>)?.choices || [];
            }
            const tOpts = !tIsArr ? (tq.options as Record<string, unknown> | undefined) : undefined;
            if (tOpts?.description) trans.section_description = tOpts.description as string;
            if (tOpts?.definitions) trans.definitions = tOpts.definitions;
            if (q.type === 'short_answer' && tOpts?.description)
              trans.question_description = tOpts.description as string;
            if (Object.keys(trans).length > 0) translations[langCode] = trans;
          }

          return {
            id: q.id,
            question_text: q.question_text,
            type: q.type,
            options: isArr ? q.options || [] : (qOpts.choices as string[]),
            max_selections: !isArr
              ? (qOpts.max_selections as number | undefined)
              : q.type === 'checkboxes'
                ? 3
                : undefined,
            has_other: !isArr ? (qOpts.has_other as boolean) : false,
            randomize_options: !isArr ? (qOpts.randomize_options as boolean) : false,
            locked_choices: !isArr ? (qOpts.locked_choices as string[]) || [] : [],
            is_required: q.is_required,
            is_conditional: q.is_conditional || false,
            logic_gates: !isArr
              ? (qOpts.logic_gates as {
                  question_id: string;
                  condition_type: string;
                  value: string;
                }[]) || []
              : [],
            logic_gate_match_type: !isArr
              ? (qOpts.logic_gate_match_type as 'all' | 'any') || 'all'
              : 'all',
            section_description: !isArr ? (qOpts.description as string) : undefined,
            description_alignment:
              !isArr && qOpts.description_alignment
                ? (qOpts.description_alignment as 'left' | 'center' | 'justify')
                : undefined,
            attachments: !isArr ? (qOpts.attachments as unknown[]) : undefined,
            reference_number: !isArr && qOpts.has_calculator ? 1 : undefined,
            definitions: !isArr ? (qOpts.definitions as unknown[]) : undefined,
            question_description:
              q.type === 'short_answer' && !isArr ? (qOpts.description as string) || '' : '',
            validation_type:
              q.type === 'short_answer' && !isArr && qOpts.validation
                ? ((qOpts.validation as Record<string, unknown>).type as string) || 'none'
                : 'none',
            validation_regex:
              q.type === 'short_answer' && !isArr && qOpts.validation
                ? ((qOpts.validation as Record<string, unknown>).regex as string) || ''
                : '',
            validation_max_length:
              q.type === 'short_answer' && !isArr && qOpts.validation
                ? ((qOpts.validation as Record<string, unknown>).max_length as number)
                : undefined,
            validation_normalize_uppercase:
              q.type === 'short_answer' && !isArr && qOpts.validation
                ? ((qOpts.validation as Record<string, unknown>).normalize_uppercase as boolean) ||
                  false
                : false,
            translations: Object.keys(translations).length > 0 ? translations : undefined,
          };
        });
        setQuestions(loadedQuestions as QuestionDraft[]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  const getOptionsArray = (options: unknown): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options as string[];
    return ((options as Record<string, unknown>).choices as string[]) || [];
  };

  const getOptionsForDisplay = (q: QuestionDraft): string[] => {
    if (language === 'en') return getOptionsArray(q.options);
    const transOpts = q.translations?.[language]?.options;
    if (transOpts && transOpts.length > 0) return transOpts;
    const legacyOpts = getOptionsArray(
      (q as unknown as Record<string, unknown>)[`options_${language}`]
    );
    if (legacyOpts.length > 0) return legacyOpts;
    return getOptionsArray(q.options);
  };

  const getTransField = (q: QuestionDraft, field: string): string => {
    if (language === 'en')
      return ((q as unknown as Record<string, unknown>)[field] as string) || '';
    const trans = q.translations?.[language] as Record<string, unknown> | undefined;
    if (trans && field in trans) return (trans[field] as string) || '';
    return ((q as unknown as Record<string, unknown>)[`${field}_${language}`] as string) || '';
  };

  const setTransField = (qId: string, field: string, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en') return { ...q, [field]: value };
        return {
          ...q,
          translations: {
            ...q.translations,
            [language]: { ...q.translations?.[language], [field]: value },
          },
        };
      })
    );
  };

  const setTransMeta = (lang: string, key: 'title' | 'description', value: string) => {
    setTranslationsMeta((prev) => ({ ...prev, [lang]: { ...prev[lang], [key]: value } }));
  };

  const getTransMeta = (lang: string, key: 'title' | 'description'): string => {
    if (lang === 'en') return key === 'title' ? title : description;
    return translationsMeta[lang]?.[key] || '';
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: QuestionDraft = {
      id: Math.random().toString(36).substr(2, 9),
      question_text: '',
      type,
      options:
        type === 'multiple_choice' ||
        type === 'checkboxes' ||
        type === 'dropdown' ||
        type === 'ranking'
          ? ['Option 1']
          : [],
      max_selections: type === 'checkboxes' ? 3 : undefined,
      has_other: false,
      randomize_options: false,
      locked_choices: [],
      is_required: type === 'section_header' ? false : true,
      is_conditional: false,
      logic_gates: [],
      logic_gate_match_type: 'all',
      section_description: type === 'section_header' ? '' : undefined,
      description_alignment: type === 'section_header' ? 'left' : undefined,
      attachments: type === 'section_header' ? [] : undefined,
      reference_number: type === 'rating_scale' ? undefined : undefined,
      question_description: '',
      validation_type: 'none',
      validation_regex: '',
      validation_max_length: undefined,
      validation_normalize_uppercase: false,
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (id: string, field: keyof QuestionDraft, value: unknown) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qId: string, index: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en') {
          const isArr = Array.isArray(q.options);
          const arr = isArr
            ? [...(q.options as string[])]
            : [...(((q.options as Record<string, unknown>).choices as string[]) || [])];
          arr[index] = value;
          return {
            ...q,
            options: isArr ? arr : { ...(q.options as Record<string, unknown>), choices: arr },
          };
        }
        const trans = q.translations?.[language] || {};
        const baseTransOpts = trans.options || [];
        const fallbackOpts = getOptionsArray(q.options);
        const arr = (baseTransOpts.length > 0 ? baseTransOpts : fallbackOpts).slice();
        arr[index] = value;
        return {
          ...q,
          translations: { ...q.translations, [language]: { ...trans, options: arr } },
        };
      })
    );
  };

  const uploadFile = async (file: File): Promise<{ url: string; filename: string } | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    } catch {
      alert('File upload failed. Please try again.');
      return null;
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    const result = await uploadFile(file);
    if (result) setThumbnailUrl(result.url);
    setThumbnailUploading(false);
  };

  const handleAttachmentUpload = async (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      setQuestions(
        questions.map((q) => {
          if (q.id !== qId) return q;
          return {
            ...q,
            attachments: [
              ...(q.attachments || []),
              { url: result.url, name: result.filename, type: file.type },
            ],
          };
        })
      );
    }
  };

  const removeAttachment = (qId: string, index: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const newAttachments = [...(q.attachments || [])];
        newAttachments.splice(index, 1);
        return { ...q, attachments: newAttachments };
      })
    );
  };

  const updateValidationType = (qId: string, type: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const preset =
          type !== 'regex'
            ? VALIDATION_PRESETS[type] || VALIDATION_PRESETS.none
            : VALIDATION_PRESETS.none;
        return {
          ...q,
          validation_type: type as QuestionDraft['validation_type'],
          validation_regex: type === 'regex' ? q.validation_regex : preset.regex || '',
          validation_max_length: type === 'regex' ? q.validation_max_length : preset.max_length,
          validation_normalize_uppercase:
            type === 'regex'
              ? q.validation_normalize_uppercase
              : (preset.normalize_uppercase ?? false),
        };
      })
    );
  };

  const addOption = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en') {
          const isArr = Array.isArray(q.options);
          const arr = isArr
            ? [...(q.options as string[])]
            : [...(((q.options as Record<string, unknown>).choices as string[]) || [])];
          arr.push(`Option ${arr.length + 1}`);
          return {
            ...q,
            options: isArr ? arr : { ...(q.options as Record<string, unknown>), choices: arr },
          };
        }
        const trans = q.translations?.[language] || {};
        const baseTransOpts = trans.options || [];
        const fallbackOpts = getOptionsArray(q.options);
        const arr = (baseTransOpts.length > 0 ? baseTransOpts : fallbackOpts).slice();
        arr.push(`Option ${arr.length + 1}`);
        return {
          ...q,
          translations: { ...q.translations, [language]: { ...trans, options: arr } },
        };
      })
    );
  };

  const addDefinition = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en')
          return { ...q, definitions: [...(q.definitions || []), { term: '', definition: '' }] };
        const trans = q.translations?.[language] || {};
        const defs = [...(trans.definitions || q.definitions || []), { term: '', definition: '' }];
        return {
          ...q,
          translations: { ...q.translations, [language]: { ...trans, definitions: defs } },
        };
      })
    );
  };

  const updateDefinition = (
    qId: string,
    index: number,
    field: 'term' | 'definition',
    value: string
  ) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en') {
          const newDefs = [...(q.definitions || [])];
          if (!newDefs[index]) newDefs[index] = { term: '', definition: '' };
          newDefs[index] = { ...newDefs[index], [field]: value };
          return { ...q, definitions: newDefs };
        }
        const trans = q.translations?.[language] || {};
        const defs = [...(trans.definitions || q.definitions || [])];
        if (!defs[index]) defs[index] = { term: '', definition: '' };
        defs[index] = { ...defs[index], [field]: value };
        return {
          ...q,
          translations: { ...q.translations, [language]: { ...trans, definitions: defs } },
        };
      })
    );
  };

  const removeDefinition = (qId: string, index: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en') {
          const newDefs = [...(q.definitions || [])];
          newDefs.splice(index, 1);
          return { ...q, definitions: newDefs };
        }
        const trans = q.translations?.[language] || {};
        const defs = [...(trans.definitions || q.definitions || [])];
        defs.splice(index, 1);
        return {
          ...q,
          translations: { ...q.translations, [language]: { ...trans, definitions: defs } },
        };
      })
    );
  };

  const toggleLockChoice = (qId: string, optText: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const locked = q.locked_choices || [];
          const newLocked = locked.includes(optText)
            ? locked.filter((c) => c !== optText)
            : [...locked, optText];
          return { ...q, locked_choices: newLocked };
        }
        return q;
      })
    );
  };

  const removeOption = (qId: string, index: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        if (language === 'en') {
          const isArr = Array.isArray(q.options);
          const arr = isArr
            ? [...(q.options as string[])]
            : [...(((q.options as Record<string, unknown>).choices as string[]) || [])];
          arr.splice(index, 1);
          return {
            ...q,
            options: isArr ? arr : { ...(q.options as Record<string, unknown>), choices: arr },
          };
        }
        const trans = q.translations?.[language] || {};
        const baseTransOpts = trans.options || [];
        const arr = baseTransOpts.slice();
        arr.splice(index, 1);
        return {
          ...q,
          translations: { ...q.translations, [language]: { ...trans, options: arr } },
        };
      })
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    const newQs = [...questions];
    [newQs[index - 1], newQs[index]] = [newQs[index], newQs[index - 1]];
    setQuestions(newQs);
  };

  const moveQuestionDown = (index: number) => {
    if (index === questions.length - 1) return;
    const newQs = [...questions];
    [newQs[index + 1], newQs[index]] = [newQs[index], newQs[index + 1]];
    setQuestions(newQs);
  };

  const addLogicGate = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        return {
          ...q,
          logic_gates: [
            ...(q.logic_gates || []),
            { question_id: '', condition_type: 'equals', value: '' },
          ],
        };
      })
    );
  };

  const updateLogicGate = (qId: string, index: number, field: string, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const newGates = [...(q.logic_gates || [])];
        newGates[index] = { ...newGates[index], [field]: value };
        return { ...q, logic_gates: newGates };
      })
    );
  };

  const removeLogicGate = (qId: string, index: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId) return q;
        const newGates = [...(q.logic_gates || [])];
        newGates.splice(index, 1);
        return { ...q, logic_gates: newGates };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Survey title is required');
      return;
    }

    if (isActive) {
      const confirmed = window.confirm(
        'WARNING: Publishing this survey as ACTIVE will immediately DEACTIVATE all other currently active surveys, and PERMANENTLY LOCK this survey from future edits. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        title,
        description,
        description_alignment: descriptionAlignment,
        thumbnail_url: thumbnailUrl || undefined,
        estimated_minutes: estimatedMinutes,
        category: category.trim() || null,
        is_active: isActive,
        enabled_languages: [...enabledLangs],
        questions: questions.map((q, idx) => {
          let optionsPayload: OptionsPayload | null = null;
          if (q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'ranking') {
            optionsPayload = {
              choices: q.options,
              has_other: q.has_other || false,
              randomize_options: q.randomize_options || false,
              locked_choices: q.locked_choices || [],
            };
          } else if (q.type === 'checkboxes') {
            optionsPayload = {
              choices: q.options,
              max_selections: q.max_selections,
              has_other: q.has_other || false,
              randomize_options: q.randomize_options || false,
              locked_choices: q.locked_choices || [],
            };
          } else if (q.type === 'rating_scale' && q.reference_number) {
            optionsPayload = { has_calculator: true };
          } else if (q.type === 'section_header') {
            optionsPayload = {
              description: q.section_description || '',
              attachments: q.attachments || [],
              description_alignment: q.description_alignment || 'left',
            };
          } else if (q.type === 'short_answer') {
            const validation =
              q.validation_type && q.validation_type !== 'none'
                ? {
                    type: q.validation_type,
                    regex: q.validation_regex || '',
                    max_length: q.validation_max_length,
                    normalize_uppercase: q.validation_normalize_uppercase || false,
                  }
                : undefined;
            optionsPayload = {
              description: q.question_description || '',
              ...(validation ? { validation } : {}),
            };
          }
          if (q.definitions && q.definitions.length > 0) {
            if (!optionsPayload) optionsPayload = {};
            optionsPayload.definitions = q.definitions;
          }
          if (q.logic_gates && q.logic_gates.length > 0) {
            if (!optionsPayload) optionsPayload = {};
            optionsPayload.logic_gates = q.logic_gates;
            optionsPayload.logic_gate_match_type = q.logic_gate_match_type || 'all';
          }
          return {
            id: q.id,
            question_text: q.question_text,
            type: q.type,
            order_index: idx + 1,
            is_required: q.is_required,
            is_conditional: q.is_conditional || false,
            options: optionsPayload,
          };
        }),
      };

      let updatedSurvey = null;
      if (!isLocked) {
        const res = await fetch(`/api/surveys/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || 'Failed to update survey');
        }
        updatedSurvey = await res.json();
      }

      for (const lang of SUPPORTED_LANGUAGES.filter((l) => l.code !== 'en')) {
        const meta = translationsMeta[lang.code];

        const langQuestions = payload.questions
          .map((q, idx) => {
            const draftQ = questions[idx];
            const updatedQ = isLocked ? draftQ : updatedSurvey?.questions?.[idx];
            const qTrans = draftQ.translations?.[lang.code];
            const hasText = qTrans?.question_text;
            const hasOptions = qTrans?.options?.length;

            if (
              !hasText &&
              !hasOptions &&
              !qTrans?.section_description &&
              !qTrans?.question_description
            ) {
              return null;
            }

            let optionsPayload: OptionsPayload | null = null;
            const transOpts = qTrans?.options || [];
            const transDesc = qTrans?.section_description || draftQ.section_description || '';
            const transQDesc = qTrans?.question_description || draftQ.question_description || '';

            if (q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'ranking') {
              optionsPayload = {
                choices: transOpts.length > 0 ? transOpts : getOptionsArray(draftQ.options),
                has_other: draftQ.has_other || false,
                randomize_options: draftQ.randomize_options || false,
                locked_choices: draftQ.locked_choices || [],
              };
            } else if (q.type === 'checkboxes') {
              optionsPayload = {
                choices: transOpts.length > 0 ? transOpts : getOptionsArray(draftQ.options),
                max_selections: draftQ.max_selections,
                has_other: draftQ.has_other || false,
                randomize_options: draftQ.randomize_options || false,
                locked_choices: draftQ.locked_choices || [],
              };
            } else if (q.type === 'rating_scale' && draftQ.reference_number) {
              optionsPayload = { has_calculator: true };
            } else if (q.type === 'section_header') {
              optionsPayload = {
                description: transDesc,
                attachments: draftQ.attachments || [],
                description_alignment: draftQ.description_alignment || 'left',
              };
            } else if (q.type === 'short_answer') {
              const validation =
                draftQ.validation_type && draftQ.validation_type !== 'none'
                  ? {
                      type: draftQ.validation_type,
                      regex: draftQ.validation_regex || '',
                      max_length: draftQ.validation_max_length,
                      normalize_uppercase: draftQ.validation_normalize_uppercase || false,
                    }
                  : undefined;
              optionsPayload = {
                description: transQDesc,
                ...(validation ? { validation } : {}),
              };
            }
            if (qTrans?.definitions && qTrans.definitions.length > 0) {
              if (!optionsPayload) optionsPayload = {};
              optionsPayload.definitions = qTrans.definitions;
            }
            if (draftQ.logic_gates && draftQ.logic_gates.length > 0) {
              if (!optionsPayload) optionsPayload = {};
              optionsPayload.logic_gates = draftQ.logic_gates;
              optionsPayload.logic_gate_match_type = draftQ.logic_gate_match_type || 'all';
            }
            return {
              ...q,
              id: updatedQ?.id || q.id,
              question_text: hasText || draftQ.question_text || '',
              options: optionsPayload,
            };
          })
          .filter(Boolean);

        if (langQuestions.length > 0) {
          const resTrans = await fetch(`/api/surveys/${params.id}/translation`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              language_code: lang.code,
              questions: langQuestions,
              title: meta?.title || '',
              description: meta?.description || '',
            }),
          });
          if (!resTrans.ok) {
            throw new Error(`Failed to save ${lang.name} translations`);
          }
        }
      }

      if (isLocked) {
        const langRes = await fetch(`/api/surveys/${params.id}/languages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled_languages: [...enabledLangs] }),
        });
        if (!langRes.ok) {
          throw new Error('Failed to save language visibility settings');
        }
      }

      router.push('/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error saving survey');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  const handleTranslateAll = async (
    apiKey: string,
    provider: 'opencode' | 'openrouter' | 'gemini'
  ) => {
    setShowTranslateDialog(false);
    setTranslateApiKey('');
    setTranslateAllLoading(true);
    setTranslateAllError('');
    setTranslateAllSuccess('');

    const englishQuestions = questions.map((q, idx) => ({
      index: idx,
      type: q.type,
      question_text: q.question_text,
      options: getOptionsArray(q.options),
      question_description: q.question_description || '',
      section_description: q.section_description || '',
      definitions: q.definitions || [],
    }));

    const langName = getLanguageConfig(language)?.name || language;
    const BATCH_SIZE = 5;
    const batches: (typeof englishQuestions)[] = [];
    for (let i = 0; i < englishQuestions.length; i += BATCH_SIZE) {
      batches.push(englishQuestions.slice(i, i + BATCH_SIZE));
    }

    try {
      let titleData: { title?: string; description?: string } | null = null;
      const allQuestions: Record<number, Record<string, unknown>> = {};

      for (let b = 0; b < batches.length; b++) {
        const isFirst = b === 0;
        setTranslateAllSuccess(`Translating batch ${b + 1} of ${batches.length}...`);

        const res = await fetch('/api/surveys/translate-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            provider,
            target_language: language,
            english_title: isFirst ? title : '',
            english_description: isFirst ? description : '',
            english_questions: batches[b],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Batch ${b + 1} failed: ${text || 'Translation failed'}`);
        }

        const data = await res.json();
        const entries = Object.entries(data.translations || {});
        if (entries.length === 0) continue;

        const [, tData] = entries[0] as [
          string,
          {
            title?: string;
            description?: string;
            questions?: Array<{
              index: number;
              question_text?: string;
              options?: string[];
              question_description?: string;
              section_description?: string;
              definitions?: { term: string; definition: string }[];
            }>;
          },
        ];

        if (isFirst && tData) {
          titleData = { title: tData.title, description: tData.description };
        }

        if (tData?.questions) {
          for (const trans of tData.questions) {
            const updates: Record<string, unknown> = {};
            if (trans.question_text) updates.question_text = trans.question_text;
            if (trans.options && trans.options.length > 0) updates.options = trans.options;
            if (trans.section_description) updates.section_description = trans.section_description;
            if (trans.question_description)
              updates.question_description = trans.question_description;
            if (trans.definitions && trans.definitions.length > 0)
              updates.definitions = trans.definitions;
            if (Object.keys(updates).length > 0) {
              allQuestions[trans.index] = updates;
            }
          }
        }
      }

      if (!titleData && Object.keys(allQuestions).length === 0) {
        throw new Error('No translations received from any batch');
      }

      const lang = language;

      if (titleData?.title) setTransMeta(lang, 'title', titleData.title);
      if (titleData?.description) setTransMeta(lang, 'description', titleData.description);

      if (Object.keys(allQuestions).length > 0) {
        setQuestions((prev) =>
          prev.map((q, idx) => {
            const updates = allQuestions[idx];
            if (!updates) return q;
            return {
              ...q,
              translations: {
                ...q.translations,
                [lang]: { ...q.translations?.[lang], ...updates },
              },
            };
          })
        );
      }

      setTranslateAllSuccess(`Translated to ${langName} — review and save`);
    } catch (err: unknown) {
      console.error('Translate All failed:', err);
      setTranslateAllError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setTranslateAllLoading(false);
    }
  };

  const toggleLanguage = (code: string) => {
    if (code === 'en') return;
    setEnabledLangs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
        <div className="flex items-center">
          <Link
            href="/admin"
            className="text-gray-500 dark:text-slate-500 hover:text-[var(--color-cyc-secondary)] dark:text-slate-100 mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">
            Edit Survey
          </h1>
        </div>
        {collab.active && (
          <PresenceBar
            peers={collab.peers}
            connected={collab.connected}
            typingNames={collab.typingNames}
          />
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded mb-6">{error}</div>}

      {isLocked && language === 'en' && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-6 border border-yellow-200">
          <strong>This survey is locked.</strong> Because it is active or has been published, its
          English structure cannot be modified. You can view its contents, or switch to another
          language to edit translations.
        </div>
      )}

      <div className="flex gap-4">
        <form onSubmit={handleSubmit} className="space-y-8 flex-1 min-w-0">
          <div className="card space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Survey Title
              </label>
              {language !== 'en' && (
                <div className="text-sm text-gray-500 dark:text-slate-400 mb-1 px-2 border-l-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 rounded-r">
                  {title || 'No English title provided'}
                </div>
              )}
              <input
                type="text"
                required={language === 'en'}
                value={language === 'en' ? title : getTransMeta(language, 'title')}
                onChange={(e) =>
                  language === 'en'
                    ? setTitle(e.target.value)
                    : setTransMeta(language, 'title', e.target.value)
                }
                disabled={isLocked && language === 'en'}
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                placeholder={
                  language === 'en'
                    ? 'Survey Title'
                    : `Title in ${getLanguageConfig(language)?.name || language}`
                }
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Description (Optional)
                </label>
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-500 dark:text-slate-500">Alignment:</label>
                  <select
                    value={descriptionAlignment}
                    onChange={(e) => setDescriptionAlignment(e.target.value)}
                    disabled={isLocked}
                    className="text-xs border rounded p-1 focus:outline-none"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="justify">Justify</option>
                  </select>
                </div>
              </div>
              {language !== 'en' && (
                <div className="text-sm text-gray-500 dark:text-slate-400 mb-2 px-2 border-l-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 rounded-r">
                  {description || 'No English description provided'}
                </div>
              )}
              <RichTextEditor
                value={language === 'en' ? description : getTransMeta(language, 'description')}
                onChange={(val) =>
                  language === 'en'
                    ? setDescription(val)
                    : setTransMeta(language, 'description', val)
                }
                readOnly={isLocked && language === 'en'}
                placeholder={
                  language === 'en'
                    ? 'What is this survey about?'
                    : `Description in ${getLanguageConfig(language)?.name || language}`
                }
                collab={
                  language === 'en' && collab.active && collab.doc && collab.provider
                    ? {
                        doc: collab.doc,
                        field: 'description',
                        provider: collab.provider,
                        user: collab.user,
                        isSeeder: collab.isSeeder,
                        ready: collab.isSeeded,
                        onActivity: collab.notifyTyping,
                      }
                    : undefined
                }
              />
            </div>
            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Survey Thumbnail
              </label>
              <div className="flex items-center space-x-4">
                {thumbnailUrl ? (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl('')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center px-4 py-2 bg-gray-50 dark:bg-slate-900/50 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-[var(--color-cyc-primary)] transition-colors">
                    <Upload className="w-4 h-4 mr-2 text-gray-500 dark:text-slate-500" />
                    <span className="text-sm text-gray-600 dark:text-slate-400">
                      {thumbnailUploading ? 'Uploading...' : 'Upload Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      disabled={thumbnailUploading}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex space-x-6">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Est. Time (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  disabled={isLocked}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  list="survey-category-options"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g. Community"
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                />
                <datalist id="survey-category-options">
                  {SURVEY_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="w-1/3 flex items-center pt-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isLocked}
                    className="mr-2 h-5 w-5 text-[var(--color-cyc-primary)]"
                  />
                  <span className="font-medium text-gray-700 dark:text-slate-300">
                    Set as Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <h2 className="text-xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                Questions
              </h2>
            </div>

            {language !== 'en' && (
              <div className="bg-blue-50 dark:bg-slate-800/50 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm">
                <div className="flex items-start">
                  <FileText className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>
                      <strong>Translation Mode:</strong> Structural changes (adding/deleting
                      questions or options) are disabled while translating. Switch back to English
                      to modify the survey structure.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${translationUploading ? 'bg-blue-200 dark:bg-blue-800 text-blue-400 dark:text-blue-300 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600 border border-blue-200 dark:border-blue-700'}`}
                  >
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
                    <span className="text-green-600 dark:text-green-400">
                      {translationUploadSuccess}
                    </span>
                  )}
                  {translationUploadError && (
                    <span className="text-red-600 dark:text-red-400">{translationUploadError}</span>
                  )}
                  {TRANSLATE_TARGET_LANGUAGES.some((l) => l.code === language) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowTranslateDialog(true)}
                        disabled={translateAllLoading}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          translateAllLoading
                            ? 'bg-blue-200 dark:bg-blue-800 text-blue-400 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600 border border-blue-200 dark:border-blue-700'
                        }`}
                      >
                        <Upload className="w-4 h-4 mr-1.5" />
                        {translateAllLoading
                          ? `Translating to ${getLanguageConfig(language)?.name || language}...`
                          : `Translate to ${getLanguageConfig(language)?.name || language}`}
                      </button>
                      {translateAllSuccess && (
                        <span className="text-green-600 dark:text-green-400">
                          {translateAllSuccess}
                        </span>
                      )}
                      {translateAllError && (
                        <span className="text-red-600 dark:text-red-400">{translateAllError}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {showTranslateDialog && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    (translateProvider === 'gemini' || translateApiKey.trim())
                  ) {
                    handleTranslateAll(translateApiKey.trim(), translateProvider);
                  }
                }}
              >
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Translate to {getLanguageConfig(language)?.name || language}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Provider
                      </label>
                      <select
                        value={translateProvider}
                        onChange={(e) =>
                          setTranslateProvider(
                            e.target.value as 'opencode' | 'openrouter' | 'gemini'
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-cyc-primary)]"
                      >
                        <option value="opencode">OpenCode Go (DeepSeek V4 Flash)</option>
                        <option value="openrouter">OpenRouter (GLM-4.5 Air)</option>
                        <option value="gemini">Google Gemini (server key)</option>
                      </select>
                    </div>
                    {translateProvider !== 'gemini' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={translateApiKey}
                          onChange={(e) => setTranslateApiKey(e.target.value)}
                          placeholder="sk-l... or sk-or-..."
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-cyc-primary)]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && translateApiKey.trim()) {
                              handleTranslateAll(translateApiKey.trim(), translateProvider);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTranslateDialog(false);
                        setTranslateApiKey('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTranslateAll(translateApiKey.trim(), translateProvider)}
                      disabled={translateProvider !== 'gemini' && !translateApiKey.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-cyc-primary)] hover:opacity-90 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Translate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {questions.map((q, qIdx) => {
              const optionsArray = getOptionsForDisplay(q);
              return (
                <div
                  key={q.id}
                  className={`card p-6 border-l-4 shadow-sm relative group ${q.type === 'section_header' ? 'border-l-[var(--color-cyc-accent)] bg-yellow-50/30' : 'border-l-[var(--color-cyc-primary)]'}`}
                >
                  <div
                    className={`absolute top-4 right-4 flex items-center space-x-1 transition-opacity ${language !== 'en' || isLocked ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <button
                      type="button"
                      onClick={() => moveQuestionUp(qIdx)}
                      disabled={qIdx === 0}
                      className={`p-1.5 rounded ${qIdx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 dark:text-slate-500 hover:text-[var(--color-cyc-primary)] hover:bg-teal-50'}`}
                      title="Move Up"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestionDown(qIdx)}
                      disabled={qIdx === questions.length - 1}
                      className={`p-1.5 rounded ${qIdx === questions.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 dark:text-slate-500 hover:text-[var(--color-cyc-primary)] hover:bg-teal-50'}`}
                      title="Move Down"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 rounded"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-start space-x-3 mb-4">
                    <span className="font-bold text-gray-400 dark:text-slate-500 mt-2">
                      {q.type === 'section_header' ? '§' : `Q${qIdx + 1}`}
                    </span>
                    <div className="flex-grow">
                      {language !== 'en' && (
                        <div className="text-sm text-gray-500 dark:text-slate-400 mb-1 px-2 border-l-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 rounded-r">
                          {q.question_text || 'No English text provided'}
                        </div>
                      )}
                      <RichTextEditor
                        value={getTransField(q, 'question_text')}
                        onChange={(val) => setTransField(q.id, 'question_text', val)}
                        readOnly={isLocked && language === 'en'}
                        placeholder={
                          language === 'en'
                            ? q.type === 'section_header'
                              ? 'Section Title'
                              : 'Type your question here...'
                            : `Translation in ${getLanguageConfig(language)?.name || language}`
                        }
                      />
                    </div>
                  </div>

                  {/* Question Description (short_answer only) */}
                  {q.type === 'short_answer' && (
                    <div className="ml-10 mb-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Helper Text / Description (Optional)
                      </label>
                      {language !== 'en' && (
                        <div className="text-xs text-gray-400 dark:text-slate-500 mb-1 px-2 border-l-2 border-gray-200 bg-gray-50 dark:bg-slate-900 p-1.5 rounded-r">
                          {q.question_description || 'No English description provided'}
                        </div>
                      )}
                      <input
                        type="text"
                        value={getTransField(q, 'question_description')}
                        onChange={(e) =>
                          setTransField(q.id, 'question_description', e.target.value)
                        }
                        disabled={isLocked && language === 'en'}
                        placeholder="e.g. We ask for the first three characters of your postal code to get a general sense of where responses are coming from."
                        className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Short Answer Validation Config */}
                  {q.type === 'short_answer' && (
                    <div className="ml-10 mb-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
                        Validation Settings
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                            Validation Type
                          </label>
                          <select
                            value={q.validation_type || 'none'}
                            onChange={(e) => updateValidationType(q.id, e.target.value)}
                            disabled={isLocked && language === 'en'}
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
                            {q.validation_type === 'regex' ? (
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    Max Length
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={q.validation_max_length || ''}
                                    onChange={(e) =>
                                      updateQuestion(
                                        q.id,
                                        'validation_max_length',
                                        e.target.value ? parseInt(e.target.value) : undefined
                                      )
                                    }
                                    disabled={isLocked && language === 'en'}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                                    placeholder="e.g. 3"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                                    Regex Pattern
                                  </label>
                                  <input
                                    type="text"
                                    value={q.validation_regex || ''}
                                    onChange={(e) =>
                                      updateQuestion(q.id, 'validation_regex', e.target.value)
                                    }
                                    disabled={isLocked && language === 'en'}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                                    placeholder="^[A-Z][0-9][A-Z]$"
                                  />
                                </div>
                                <div className="flex items-center">
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={q.validation_normalize_uppercase || false}
                                      onChange={(e) =>
                                        updateQuestion(
                                          q.id,
                                          'validation_normalize_uppercase',
                                          e.target.checked
                                        )
                                      }
                                      disabled={isLocked && language === 'en'}
                                      className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-slate-300">
                                      Normalize to uppercase
                                    </span>
                                  </label>
                                </div>
                              </>
                            ) : (
                              <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                                {q.validation_type === 'email' && (
                                  <>
                                    <strong>Email rules:</strong> Must contain @ and a domain. Max
                                    254 characters.
                                  </>
                                )}
                                {q.validation_type === 'postal_code_prefix' && (
                                  <>
                                    <strong>Postal code prefix rules:</strong> Max 3 characters.
                                    Format: letter, number, letter (e.g. M5V). Input is
                                    automatically normalized to uppercase.
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 text-sm text-gray-600 dark:text-slate-400 ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                      <label className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={q.is_required}
                          onChange={(e) => updateQuestion(q.id, 'is_required', e.target.checked)}
                          className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]"
                        />
                        Required
                      </label>
                      <label className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={q.is_conditional || false}
                          onChange={(e) => updateQuestion(q.id, 'is_conditional', e.target.checked)}
                          className="mr-2 h-4 w-4 text-purple-500"
                        />
                        Skip if answered previously
                      </label>
                    </div>
                    {q.type === 'checkboxes' && (
                      <label className="flex items-center ml-4">
                        <span className="mr-2">Max Selections:</span>
                        <input
                          type="number"
                          min={1}
                          max={optionsArray.length + (q.has_other ? 1 : 0)}
                          value={q.max_selections || 1}
                          onChange={(e) =>
                            updateQuestion(q.id, 'max_selections', parseInt(e.target.value) || 1)
                          }
                          className="w-16 p-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none text-center"
                        />
                      </label>
                    )}
                  </div>

                  {(q.type === 'multiple_choice' ||
                    q.type === 'checkboxes' ||
                    q.type === 'dropdown' ||
                    q.type === 'ranking') && (
                    <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600 dark:text-slate-400 pl-8">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.has_other || false}
                          onChange={(e) => updateQuestion(q.id, 'has_other', e.target.checked)}
                          className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]"
                        />
                        Include &quot;Other&quot; option
                      </label>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.randomize_options || false}
                          onChange={(e) =>
                            updateQuestion(q.id, 'randomize_options', e.target.checked)
                          }
                          className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]"
                        />
                        Randomize option order
                      </label>
                    </div>
                  )}

                  {q.type === 'rating_scale' && (
                    <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600 dark:text-slate-400 pl-8">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.reference_number === 1}
                          onChange={(e) =>
                            updateQuestion(
                              q.id,
                              'reference_number',
                              e.target.checked ? 1 : undefined
                            )
                          }
                          className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]"
                        />
                        Enable reference number calculator
                      </label>
                    </div>
                  )}

                  {(q.type === 'multiple_choice' ||
                    q.type === 'checkboxes' ||
                    q.type === 'dropdown' ||
                    q.type === 'ranking') && (
                    <div className="ml-10 pr-28 space-y-2">
                      {optionsArray.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className="flex items-center space-x-2">
                          <div
                            className={`w-4 h-4 border border-gray-400 ${q.type === 'multiple_choice' || q.type === 'dropdown' ? 'rounded-full' : 'rounded'}`}
                          />
                          <input
                            type="text"
                            value={opt}
                            required={language === 'en'}
                            placeholder={
                              language === 'en'
                                ? `Option ${oIdx + 1}`
                                : getOptionsArray(q.options)[oIdx] || `Option ${oIdx + 1}`
                            }
                            onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                            className={`flex-grow p-1.5 border-b focus:border-[var(--color-cyc-primary)] focus:outline-none bg-transparent ${language !== 'en' ? 'border-blue-200 focus:border-blue-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleLockChoice(q.id, opt)}
                            className={`ml-2 ${(q.locked_choices || []).includes(opt) ? 'text-[var(--color-cyc-primary)]' : 'text-gray-300 hover:text-gray-500 dark:text-slate-500'} ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                            title="Lock Option Position"
                          >
                            {(q.locked_choices || []).includes(opt) ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                          {optionsArray.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, oIdx)}
                              className={`text-gray-400 dark:text-slate-500 hover:text-red-500 ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(q.id)}
                        className={`text-sm text-[var(--color-cyc-primary)] hover:underline mt-2 inline-block ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                      >
                        + Add Option
                      </button>
                    </div>
                  )}

                  {/* Section Header: Description + Attachments */}
                  {q.type === 'section_header' && (
                    <div className="space-y-3 ml-10 pr-28">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-gray-600 dark:text-slate-400">
                            Section Description
                          </label>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-500 dark:text-slate-500">
                              Alignment:
                            </label>
                            <select
                              value={q.description_alignment || 'left'}
                              onChange={(e) =>
                                updateQuestion(q.id, 'description_alignment', e.target.value)
                              }
                              className="text-xs border rounded p-1 focus:outline-none"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="justify">Justify</option>
                            </select>
                          </div>
                        </div>
                        <RichTextEditor
                          value={getTransField(q, 'section_description')}
                          onChange={(val) => setTransField(q.id, 'section_description', val)}
                          readOnly={isLocked && language === 'en'}
                          placeholder={
                            language === 'en'
                              ? 'Provide context or instructions before the next set of questions...'
                              : `Translation in ${getLanguageConfig(language)?.name || language}`
                          }
                        />
                      </div>
                      <div className={language !== 'en' || isLocked ? 'hidden' : ''}>
                        <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
                          Attachments
                        </label>
                        {(q.attachments || []).map((att, aIdx) => (
                          <div
                            key={aIdx}
                            className="flex items-center space-x-2 mb-2 bg-white dark:bg-slate-800 p-2 rounded border text-sm"
                          >
                            {att.type.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 text-green-500" />
                            ) : (
                              <FileText className="w-4 h-4 text-blue-500" />
                            )}
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex-grow truncate"
                            >
                              {att.name}
                            </a>
                            <button
                              type="button"
                              onClick={() => removeAttachment(q.id, aIdx)}
                              className="text-red-400 hover:text-red-600"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                        <label className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 rounded cursor-pointer hover:border-[var(--color-cyc-primary)] transition-colors text-sm">
                          <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500 dark:text-slate-500" />
                          <span className="text-gray-600 dark:text-slate-400">
                            Add File (PDF, PNG, JPEG)
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                            onChange={(e) => handleAttachmentUpload(q.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Definitions Section */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Interactive Definitions
                      </h4>
                      <button
                        type="button"
                        onClick={() => addDefinition(q.id)}
                        className={`text-xs text-[var(--color-cyc-primary)] hover:underline ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                      >
                        + Add Definition
                      </button>
                    </div>
                    {(() => {
                      const displayDefs =
                        language === 'en'
                          ? q.definitions || []
                          : q.translations?.[language]?.definitions || q.definitions || [];
                      if (displayDefs.length === 0) return null;
                      return (
                        <div className="space-y-2">
                          {displayDefs.map((def, dIdx) => (
                            <div key={dIdx} className="flex items-start space-x-2">
                              <div className="w-1/3">
                                <input
                                  type="text"
                                  placeholder={
                                    language === 'en'
                                      ? 'Term'
                                      : q.definitions?.[dIdx]?.term || 'Term'
                                  }
                                  value={def.term}
                                  onChange={(e) =>
                                    updateDefinition(q.id, dIdx, 'term', e.target.value)
                                  }
                                  className={`w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none ${language !== 'en' ? 'border-blue-200' : ''}`}
                                />
                              </div>
                              <div className="flex-grow">
                                <textarea
                                  placeholder={
                                    language === 'en'
                                      ? 'Definition text...'
                                      : q.definitions?.[dIdx]?.definition || 'Definition text...'
                                  }
                                  value={def.definition}
                                  onChange={(e) =>
                                    updateDefinition(q.id, dIdx, 'definition', e.target.value)
                                  }
                                  rows={1}
                                  className={`w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none resize-none ${language !== 'en' ? 'border-blue-200' : ''}`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeDefinition(q.id, dIdx)}
                                className={`p-1.5 text-gray-400 hover:text-red-500 ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Logic Gating Section */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                        Logic Gating (Display Conditions)
                      </h4>
                      <div className="flex items-center space-x-2">
                        {q.logic_gates && q.logic_gates.length > 1 && (
                          <select
                            value={q.logic_gate_match_type || 'all'}
                            onChange={(e) =>
                              updateQuestion(q.id, 'logic_gate_match_type', e.target.value)
                            }
                            className={`text-xs border rounded p-1 focus:outline-none ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                          >
                            <option value="all">Match ALL conditions</option>
                            <option value="any">Match ANY condition</option>
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => addLogicGate(q.id)}
                          className={`text-xs text-[var(--color-cyc-primary)] hover:underline ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                        >
                          + Add Condition
                        </button>
                      </div>
                    </div>
                    {q.logic_gates && q.logic_gates.length > 0 && (
                      <div className="space-y-2">
                        {q.logic_gates.map((gate, gIdx) => (
                          <div
                            key={gIdx}
                            className="flex items-start space-x-2 p-2 bg-gray-50 dark:bg-slate-800 rounded"
                          >
                            <div className="flex-grow flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                              <select
                                value={gate.question_id}
                                onChange={(e) =>
                                  updateLogicGate(q.id, gIdx, 'question_id', e.target.value)
                                }
                                disabled={language !== 'en' || isLocked}
                                className="w-full sm:w-1/2 p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                              >
                                <option value="">-- Select Question --</option>
                                {questions
                                  .slice(0, qIdx)
                                  .filter(
                                    (prevQ) =>
                                      prevQ.type === 'multiple_choice' ||
                                      prevQ.type === 'checkboxes' ||
                                      prevQ.type === 'dropdown'
                                  )
                                  .map((prevQ) => (
                                    <option key={prevQ.id} value={prevQ.id}>
                                      {prevQ.question_text ||
                                        `Question ${questions.indexOf(prevQ) + 1}`}
                                    </option>
                                  ))}
                              </select>
                              <select
                                value={gate.value}
                                onChange={(e) =>
                                  updateLogicGate(q.id, gIdx, 'value', e.target.value)
                                }
                                disabled={language !== 'en' || isLocked || !gate.question_id}
                                className="w-full sm:w-1/2 p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                              >
                                <option value="">-- Requires Answer --</option>
                                {gate.question_id &&
                                questions.find((pq) => pq.id === gate.question_id)
                                  ? getOptionsArray(
                                      questions.find((pq) => pq.id === gate.question_id)?.options
                                    ).map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))
                                  : null}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLogicGate(q.id, gIdx)}
                              className={`p-1.5 text-gray-400 hover:text-red-500 ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <div
              className={`bg-gray-50 dark:bg-slate-900/50 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center ${language !== 'en' || isLocked ? 'hidden' : ''}`}
            >
              <p className="text-gray-500 dark:text-slate-500 mb-4">
                Add a new question to this survey
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => addQuestion('section_header')}
                  className="px-4 py-2 bg-yellow-50 border border-yellow-300 rounded shadow-sm hover:border-[var(--color-cyc-accent)] transition-colors text-sm font-medium text-yellow-700"
                >
                  § Section Header
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('multiple_choice')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('ranking')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Ranking
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('checkboxes')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Checkboxes
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('dropdown')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Dropdown
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('rating_scale')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Percentage Slider (0-100)
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('likert_scale')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Likert Scale (1-5)
                </button>
                <button
                  type="button"
                  onClick={() => addQuestion('short_answer')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Short Answer
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-slate-700">
            <Link
              href="/admin"
              className="px-6 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 font-medium mr-4"
            >
              Cancel
            </Link>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center">
              {submitting ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Survey
                </>
              )}
            </button>
          </div>
        </form>

        {/* Language sidebar */}
        <div className="flex flex-col gap-1 w-32 flex-shrink-0 pt-0 sticky top-4 self-start">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isEnabled = enabledLangs.has(lang.code);
            const isLocked = lang.code === 'en';
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-between ${
                  language === lang.code
                    ? 'bg-[var(--color-cyc-primary)] text-white shadow-sm'
                    : isEnabled
                      ? 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                      : 'text-gray-400 dark:text-slate-600 hover:bg-gray-100 dark:hover:bg-slate-800 opacity-50'
                }`}
              >
                <span>{lang.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLanguage(lang.code);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      toggleLanguage(lang.code);
                    }
                  }}
                  className={`cursor-pointer flex-shrink-0 ml-1 ${
                    isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                  }`}
                  title={
                    isLocked
                      ? 'English is always enabled'
                      : isEnabled
                        ? 'Click to hide from end users'
                        : 'Click to make visible to end users'
                  }
                >
                  {isLocked ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : isEnabled ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
