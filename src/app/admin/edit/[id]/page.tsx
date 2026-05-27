"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PlusCircle, Trash2, ArrowLeft, Save, Upload, FileText, Image as ImageIcon , Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { RichTextEditor } from '@/components/RichTextEditor';

type QuestionType = 'multiple_choice' | 'short_answer' | 'rating_scale' | 'checkboxes' | 'likert_scale' | 'dropdown' | 'section_header' | 'ranking';

interface QuestionDraft {
  id: string;
  question_text: string;
  type: QuestionType;
  options: any; // will normalize to array in state
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
  definitions?: {term: string; definition: string}[];
  question_text_fr?: string;
  options_fr?: any;
  section_description_fr?: string;
  definitions_fr?: {term: string; definition: string}[];
  question_text_zh?: string;
  options_zh?: any;
  section_description_zh?: string;
  definitions_zh?: {term: string; definition: string}[];
}

export default function EditSurvey() {
  const router = useRouter();
  const params = useParams();
  
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [titleFr, setTitleFr] = useState('');
  const [titleZh, setTitleZh] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionFr, setDescriptionFr] = useState('');
  const [descriptionZh, setDescriptionZh] = useState('');
  const [descriptionAlignment, setDescriptionAlignment] = useState('left');
  const [estimatedMinutes, setEstimatedMinutes] = useState(5);
  const [isActive, setIsActive] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [language, setLanguage] = useState<'en' | 'fr' | 'zh'>('en');
  const [isLocked, setIsLocked] = useState(false);
  const [translationUploading, setTranslationUploading] = useState(false);
  const [translationUploadError, setTranslationUploadError] = useState('');
  const [translationUploadSuccess, setTranslationUploadSuccess] = useState('');

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
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          setTranslationUploadError('Upload timed out after 3 minutes — the server may still be processing. Try refreshing the page to see if translations were saved.');
        } else {
          setTranslationUploadError(`Connection lost — the server may still be processing. Try refreshing the page to see if translations were saved.`);
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
    } catch (err: any) {
      setTranslationUploadError(err.message || 'Failed to parse PDF');
    } finally {
      setTranslationUploading(false);
      e.target.value = '';
    }
  };

  const populateTranslations = async () => {
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
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/surveys/${params.id}`).then(res => {
        if (!res.ok) throw new Error('Survey not found');
        return res.json();
      }),
      fetch(`/api/surveys/${params.id}/translation`).then(res => res.ok ? res.json() : { questions_fr: null })
    ])
      .then(([data, transData]) => {
        setIsLocked(data.has_been_published || data.is_active);
        setTitle(data.title);
        setDescription(data.description || '');
        setDescriptionAlignment(data.description_alignment || 'left');
        setEstimatedMinutes(data.estimated_minutes);
        setIsActive(data.is_active);
        setThumbnailUrl(data.thumbnail_url || '');

        setTitleFr(transData?.title_fr || '');
        setDescriptionFr(transData?.description_fr || '');
        setTitleZh(transData?.title_zh || '');
        setDescriptionZh(transData?.description_zh || '');

        const frQuestions = transData.questions_fr || [];
        const zhQuestions = transData.questions_zh || [];
        
        // Map questions
        const loadedQuestions = data.questions.map((q: any) => {
          const frQ = frQuestions.find((fq: any) => fq.id === q.id) || {};
          const zhQ = zhQuestions.find((zq: any) => zq.id === q.id) || {};
          const isArr = !q.options || Array.isArray(q.options);
          const isFrArr = !frQ.options || Array.isArray(frQ.options);
          const isZhArr = !zhQ.options || Array.isArray(zhQ.options);
          
          return {
            id: q.id, // Use real ID so we can match properly, or a stable one
            question_text: q.question_text,
            type: q.type,
            options: isArr ? (q.options || []) : q.options.choices,
            max_selections: !isArr ? q.options.max_selections : (q.type === 'checkboxes' ? 3 : undefined),
            has_other: !isArr ? q.options.has_other : false,
            randomize_options: !isArr ? q.options.randomize_options : false,
            locked_choices: !isArr ? q.options.locked_choices || [] : [],
            is_required: q.is_required,
            is_conditional: q.is_conditional || false,
            logic_gates: !isArr ? q.options.logic_gates || [] : [],
            logic_gate_match_type: !isArr ? q.options.logic_gate_match_type || 'all' : 'all',
            section_description: !isArr ? q.options.description : undefined,
            description_alignment: (!isArr && q.options.description_alignment) ? q.options.description_alignment : undefined,
            attachments: !isArr ? q.options.attachments : undefined,
            reference_number: (!isArr && q.options.has_calculator) ? 1 : undefined,
            definitions: !isArr ? q.options.definitions : undefined,
            
            // French fields
            question_text_fr: frQ.question_text || '',
            options_fr: isFrArr ? (frQ.options || []) : (frQ.options?.choices || []),
            section_description_fr: (!isFrArr && frQ.options?.description) ? frQ.options.description : '',
            definitions_fr: !isFrArr ? frQ.options?.definitions : undefined,
            
            // Chinese fields
            question_text_zh: zhQ.question_text || '',
            options_zh: isZhArr ? (zhQ.options || []) : (zhQ.options?.choices || []),
            section_description_zh: (!isZhArr && zhQ.options?.description) ? zhQ.options.description : '',
            definitions_zh: !isZhArr ? zhQ.options?.definitions : undefined
          };
        });
        setQuestions(loadedQuestions);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.id]);

  const getOptionsArray = (options: any): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options as string[];
    return (options.choices || []) as string[];
  };

  const getOptionsForDisplay = (q: QuestionDraft): string[] => {
    if (language === 'fr') {
      const frOptions = getOptionsArray(q.options_fr);
      if (frOptions.length > 0) return frOptions;
    } else if (language === 'zh') {
      const zhOptions = getOptionsArray(q.options_zh);
      if (zhOptions.length > 0) return zhOptions;
    }
    return getOptionsArray(q.options);
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: QuestionDraft = {
      id: Math.random().toString(36).substr(2, 9),
      question_text: '',
      type,
      options: type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown' || type === 'ranking' ? ['Option 1'] : [],
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
      reference_number: type === 'rating_scale' ? undefined : undefined
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (id: string, field: keyof QuestionDraft, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: string, index: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      if (language === 'fr') {
        const base = getOptionsArray(q.options_fr);
        const arr = (base.length > 0 ? base : getOptionsArray(q.options)).slice();
        arr[index] = value;
        return { ...q, options_fr: arr };
      } else {
        const isArr = Array.isArray(q.options);
        const arr = isArr ? [...q.options] : [...(q.options.choices || [])];
        arr[index] = value;
        return { ...q, options: isArr ? arr : { ...q.options, choices: arr } };
      }
    }));
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
      setQuestions(questions.map(q => {
        if (q.id !== qId) return q;
        return { ...q, attachments: [...(q.attachments || []), { url: result.url, name: result.filename, type: file.type }] };
      }));
    }
  };

  const removeAttachment = (qId: string, index: number) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newAttachments = [...(q.attachments || [])];
      newAttachments.splice(index, 1);
      return { ...q, attachments: newAttachments };
    }));
  };

  const addOption = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const isArr = Array.isArray(q.options);
      const arr = isArr ? [...q.options] : [...(q.options.choices || [])];
      arr.push(`Option ${arr.length + 1}`);
      return { ...q, options: isArr ? arr : { ...q.options, choices: arr } };
    }));
  };

  const addDefinition = (qId: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      return { ...q, definitions: [...(q.definitions || []), { term: '', definition: '' }] };
    }));
  };

  const updateDefinition = (qId: string, index: number, field: 'term' | 'definition', value: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      if (language === 'fr') {
        const newDefs = [...(q.definitions_fr || q.definitions || [])];
        if (!newDefs[index]) newDefs[index] = { term: '', definition: '' };
        newDefs[index] = { ...newDefs[index], [field]: value };
        return { ...q, definitions_fr: newDefs };
      } else {
        const newDefs = [...(q.definitions || [])];
        if (!newDefs[index]) newDefs[index] = { term: '', definition: '' };
        newDefs[index] = { ...newDefs[index], [field]: value };
        return { ...q, definitions: newDefs };
      }
    }));
  };

  const removeDefinition = (qId: string, index: number) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newDefs = [...(q.definitions || [])];
      newDefs.splice(index, 1);
      return { ...q, definitions: newDefs };
    }));
  };

  const toggleLockChoice = (qId: string, optText: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const locked = q.locked_choices || [];
        const newLocked = locked.includes(optText) ? locked.filter(c => c !== optText) : [...locked, optText];
        return { ...q, locked_choices: newLocked };
      }
      return q;
    }));
  };

  const removeOption = (qId: string, index: number) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const isArr = Array.isArray(q.options);
      const arr = isArr ? [...q.options] : [...(q.options.choices || [])];
      arr.splice(index, 1);
      return { ...q, options: isArr ? arr : { ...q.options, choices: arr } };
    }));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
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
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      return { ...q, logic_gates: [...(q.logic_gates || []), { question_id: '', condition_type: 'equals', value: '' }] };
    }));
  };

  const updateLogicGate = (qId: string, index: number, field: string, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newGates = [...(q.logic_gates || [])];
      newGates[index] = { ...newGates[index], [field]: value };
      return { ...q, logic_gates: newGates };
    }));
  };

  const removeLogicGate = (qId: string, index: number) => {
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      const newGates = [...(q.logic_gates || [])];
      newGates.splice(index, 1);
      return { ...q, logic_gates: newGates };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Survey title is required');
      return;
    }

    if (isActive) {
      const confirmed = window.confirm(
        "WARNING: Publishing this survey as ACTIVE will immediately DEACTIVATE all other currently active surveys, and PERMANENTLY LOCK this survey from future edits. Are you sure you want to proceed?"
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
        is_active: isActive,
        questions: questions.map((q, idx) => {
          let optionsPayload: any = null;
          if (q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'ranking') {
            optionsPayload = { choices: q.options, has_other: q.has_other || false, randomize_options: q.randomize_options || false, locked_choices: q.locked_choices || [] };
          } else if (q.type === 'checkboxes') {
            optionsPayload = { choices: q.options, max_selections: q.max_selections, has_other: q.has_other || false, randomize_options: q.randomize_options || false, locked_choices: q.locked_choices || [] };
          } else if (q.type === 'rating_scale' && q.reference_number) {
            optionsPayload = { has_calculator: true };
          } else if (q.type === 'section_header') {
            optionsPayload = { description: q.section_description || '', attachments: q.attachments || [], description_alignment: q.description_alignment || 'left' };
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
            question_text: q.question_text,
            type: q.type,
            order_index: idx + 1,
            is_required: q.is_required,
            is_conditional: q.is_conditional || false,
            options: optionsPayload
          };
        })
      };

      let updatedSurvey = null;
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

      // Also generate and save Translation payloads
      const payload_fr = payload.questions.map((q, idx) => {
        const draftQ = questions[idx];
        const updatedQ = isLocked ? draftQ : updatedSurvey.questions?.[idx];
        let optionsFr: any = null;
        if (q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'ranking') {
          optionsFr = { choices: draftQ.options_fr || q.options?.choices || [], has_other: q.options?.has_other || false, randomize_options: q.options?.randomize_options || false, locked_choices: q.options?.locked_choices || [] };
        } else if (q.type === 'checkboxes') {
          optionsFr = { choices: draftQ.options_fr || q.options?.choices || [], max_selections: q.options?.max_selections, has_other: q.options?.has_other || false, randomize_options: q.options?.randomize_options || false, locked_choices: q.options?.locked_choices || [] };
        } else if (q.type === 'rating_scale' && draftQ.reference_number) {
          optionsFr = { has_calculator: true };
        } else if (q.type === 'section_header') {
          optionsFr = { description: draftQ.section_description_fr || draftQ.section_description || '', attachments: draftQ.attachments || [], description_alignment: draftQ.description_alignment || 'left' };
        }
        if (draftQ.definitions_fr && draftQ.definitions_fr.length > 0) {
          if (!optionsFr) optionsFr = {};
          optionsFr.definitions = draftQ.definitions_fr;
        }
        if (draftQ.logic_gates && draftQ.logic_gates.length > 0) {
          if (!optionsFr) optionsFr = {};
          optionsFr.logic_gates = draftQ.logic_gates;
          optionsFr.logic_gate_match_type = draftQ.logic_gate_match_type || 'all';
        }
        return {
          id: updatedQ?.id,
          ...q,
          question_text: draftQ.question_text_fr || draftQ.question_text || '',
          options: optionsFr
        };
      });
      
      const payload_zh = payload.questions.map((q, idx) => {
        const draftQ = questions[idx];
        const updatedQ = isLocked ? draftQ : updatedSurvey.questions?.[idx];
        let optionsZh: any = null;
        if (q.type === 'multiple_choice' || q.type === 'dropdown' || q.type === 'ranking') {
          optionsZh = { choices: draftQ.options_zh || q.options?.choices || [], has_other: q.options?.has_other || false, randomize_options: q.options?.randomize_options || false, locked_choices: q.options?.locked_choices || [] };
        } else if (q.type === 'checkboxes') {
          optionsZh = { choices: draftQ.options_zh || q.options?.choices || [], max_selections: q.options?.max_selections, has_other: q.options?.has_other || false, randomize_options: q.options?.randomize_options || false, locked_choices: q.options?.locked_choices || [] };
        } else if (q.type === 'rating_scale' && draftQ.reference_number) {
          optionsZh = { has_calculator: true };
        } else if (q.type === 'section_header') {
          optionsZh = { description: draftQ.section_description_zh || draftQ.section_description || '', attachments: draftQ.attachments || [], description_alignment: draftQ.description_alignment || 'left' };
        }
        if (draftQ.definitions_zh && draftQ.definitions_zh.length > 0) {
          if (!optionsZh) optionsZh = {};
          optionsZh.definitions = draftQ.definitions_zh;
        }
        if (draftQ.logic_gates && draftQ.logic_gates.length > 0) {
          if (!optionsZh) optionsZh = {};
          optionsZh.logic_gates = draftQ.logic_gates;
          optionsZh.logic_gate_match_type = draftQ.logic_gate_match_type || 'all';
        }
        return {
          id: updatedQ?.id,
          ...q,
          question_text: draftQ.question_text_zh || draftQ.question_text || '',
          options: optionsZh
        };
      });

      const filteredPayloadFr = payload_fr.filter((q: any) => q.id);
      const filteredPayloadZh = payload_zh.filter((q: any) => q.id);
      
      if (filteredPayloadFr.length > 0 || filteredPayloadZh.length > 0) {
        const transPayload: any = {};
        if (filteredPayloadFr.length > 0) {
          transPayload.questions_fr = filteredPayloadFr;
          transPayload.title_fr = titleFr || '';
          transPayload.description_fr = descriptionFr || '';
        }
        if (filteredPayloadZh.length > 0) {
          transPayload.questions_zh = filteredPayloadZh;
          transPayload.title_zh = titleZh || '';
          transPayload.description_zh = descriptionZh || '';
        }
        
        const resTrans = await fetch(`/api/surveys/${params.id}/translation`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transPayload)
        });

        if (!resTrans.ok) {
          throw new Error('Failed to save translations');
        }
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Error saving survey');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div></div>;
  }



  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
        <div className="flex items-center">
          <Link href="/admin" className="text-gray-500 dark:text-slate-500 hover:text-[var(--color-cyc-secondary)] dark:text-slate-100 mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">Edit Survey</h1>
        </div>
        <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${language === 'en' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('fr')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${language === 'fr' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Français
          </button>
          <button
            type="button"
            onClick={() => setLanguage('zh')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${language === 'zh' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            中文
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      {isLocked && language === 'en' && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-6 border border-yellow-200">
          <strong>This survey is locked.</strong> Because it is active or has been published, its English structure cannot be modified. You can view its contents, or switch to Français to edit translations.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Survey Title</label>
            {language !== 'en' && (
              <div className="text-sm text-gray-500 dark:text-slate-400 mb-1 px-2 border-l-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 rounded-r">
                {title || "No English title provided"}
              </div>
            )}
            <input
              type="text"
              required={language === 'en'}
              value={language === 'en' ? title : titleFr}
              onChange={(e) => language === 'en' ? setTitle(e.target.value) : setTitleFr(e.target.value)}
              disabled={isLocked && language === 'en'}
              className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
              placeholder={language === 'fr' ? "Titre en francais" : "Survey Title"}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Description (Optional)</label>
              <div className="flex items-center space-x-2">
                <label className="text-xs text-gray-500 dark:text-slate-500">Alignment:</label>
                <select value={descriptionAlignment} onChange={(e) => setDescriptionAlignment(e.target.value)} disabled={isLocked} className="text-xs border rounded p-1 focus:outline-none">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
            </div>
            {language !== 'en' && (
              <div className="text-sm text-gray-500 dark:text-slate-400 mb-2 px-2 border-l-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 rounded-r">
                {description || "No English description provided"}
              </div>
            )}
            <textarea
              value={language === 'en' ? description : descriptionFr}
              onChange={(e) => language === 'en' ? setDescription(e.target.value) : setDescriptionFr(e.target.value)}
              disabled={isLocked && language === 'en'}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:border-transparent transition-all"
              rows={4}
              placeholder={language === 'fr' ? "De quoi s'agit-il?" : "What is this survey about?"}
            />
          </div>
          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Survey Thumbnail</label>
            <div className="flex items-center space-x-4">
              {thumbnailUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setThumbnailUrl('')}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">&times;</button>
                </div>
              ) : (
                <label className="flex items-center px-4 py-2 bg-gray-50 dark:bg-slate-900/50 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-[var(--color-cyc-primary)] transition-colors">
                  <Upload className="w-4 h-4 mr-2 text-gray-500 dark:text-slate-500" />
                  <span className="text-sm text-gray-600 dark:text-slate-400">{thumbnailUploading ? 'Uploading...' : 'Upload Image'}</span>
                  <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" disabled={thumbnailUploading} />
                </label>
              )}
            </div>
          </div>

          <div className="flex space-x-6">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Est. Time (minutes)</label>
              <input
                type="number"
                min={1}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                disabled={isLocked}
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
              />
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
                <span className="font-medium text-gray-700 dark:text-slate-300">Set as Active</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <h2 className="text-xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">Questions</h2>
          </div>
          
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

          {questions.map((q, qIdx) => {
            const optionsArray = getOptionsForDisplay(q);
            return (
              <div key={q.id} className={`card p-6 border-l-4 shadow-sm relative group ${q.type === 'section_header' ? 'border-l-[var(--color-cyc-accent)] bg-yellow-50/30' : 'border-l-[var(--color-cyc-primary)]'}`}>
                <div className={`absolute top-4 right-4 flex items-center space-x-1 transition-opacity ${language !== 'en' || isLocked ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}>
                  <button type="button" onClick={() => moveQuestionUp(qIdx)} disabled={qIdx === 0} className={`p-1.5 rounded ${qIdx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 dark:text-slate-500 hover:text-[var(--color-cyc-primary)] hover:bg-teal-50'}`} title="Move Up">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button type="button" onClick={() => moveQuestionDown(qIdx)} disabled={qIdx === questions.length - 1} className={`p-1.5 rounded ${qIdx === questions.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 dark:text-slate-500 hover:text-[var(--color-cyc-primary)] hover:bg-teal-50'}`} title="Move Down">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <button type="button" onClick={() => removeQuestion(q.id)} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 rounded" title="Delete Question">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-start space-x-3 mb-4">
                  <span className="font-bold text-gray-400 dark:text-slate-500 mt-2">{q.type === 'section_header' ? '§' : `Q${qIdx + 1}`}</span>
                  <div className="flex-grow">
                    {language !== 'en' && (
                      <div className="text-sm text-gray-500 dark:text-slate-400 mb-1 px-2 border-l-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 rounded-r">
                        {q.question_text || "No English text provided"}
                      </div>
                    )}
                    <input
                      type="text"
                      required={language === 'en'}
                      value={language === 'en' ? q.question_text : (q.question_text_fr || '')}
                      onChange={(e) => updateQuestion(q.id, language === 'en' ? 'question_text' : 'question_text_fr', e.target.value)}
                      disabled={isLocked && language === 'en'}
                      placeholder={language === 'fr' ? "Traduction française" : "Question Text"}
                      className="w-full p-2 border rounded font-medium focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 text-sm text-gray-600 dark:text-slate-400 ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <label className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-slate-400">
                    <input type="checkbox"
                      checked={q.is_required}
                      onChange={(e) => updateQuestion(q.id, 'is_required', e.target.checked)}
                      className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]" />
                    Required
                  </label>
                  <label className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-slate-400">
                    <input type="checkbox" checked={q.is_conditional || false}
                      onChange={(e) => updateQuestion(q.id, 'is_conditional', e.target.checked)}
                      className="mr-2 h-4 w-4 text-purple-500" />
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
                        onChange={(e) => updateQuestion(q.id, 'max_selections', parseInt(e.target.value) || 1)}
                        className="w-16 p-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:outline-none text-center"
                      />
                    </label>
                  )}
                </div>

                {(q.type === 'multiple_choice' || q.type === 'checkboxes' || q.type === 'dropdown' || q.type === 'ranking') && (
                  <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600 dark:text-slate-400 pl-8">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={q.has_other || false}
                        onChange={(e) => updateQuestion(q.id, 'has_other', e.target.checked)}
                        className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]" />
                      Include &quot;Other&quot; option
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={q.randomize_options || false}
                        onChange={(e) => updateQuestion(q.id, 'randomize_options', e.target.checked)}
                        className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]" />
                      Randomize option order
                    </label>
                  </div>
                )}

                {q.type === 'rating_scale' && (
                  <div className="flex items-center space-x-6 mb-4 text-sm text-gray-600 dark:text-slate-400 pl-8">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={q.reference_number === 1}
                        onChange={(e) => updateQuestion(q.id, 'reference_number', e.target.checked ? 1 : undefined)}
                        className="mr-2 h-4 w-4 text-[var(--color-cyc-primary)]" />
                      Enable reference number calculator
                    </label>
                  </div>
                )}

                {(q.type === 'multiple_choice' || q.type === 'checkboxes' || q.type === 'dropdown' || q.type === 'ranking') && (
                  <div className="ml-10 pr-28 space-y-2">
                    {optionsArray.map((opt: string, oIdx: number) => (
                      <div key={oIdx} className="flex items-center space-x-2">
                        <div className={`w-4 h-4 border border-gray-400 ${(q.type === 'multiple_choice' || q.type === 'dropdown') ? 'rounded-full' : 'rounded'}`} />
                        <input
                          type="text"
                          value={opt}
                          required={language === 'en'}
                          placeholder={language === 'fr' ? (getOptionsArray(q.options)[oIdx] || `Option ${oIdx + 1} (Francais)`) : `Option ${oIdx + 1}`}
                          onChange={(e) => updateOption(q.id, oIdx, e.target.value)}
                          className={`flex-grow p-1.5 border-b focus:border-[var(--color-cyc-primary)] focus:outline-none bg-transparent ${language === 'fr' ? 'border-blue-200 focus:border-blue-500' : ''}`}
                        />
                        <button type="button" onClick={() => toggleLockChoice(q.id, opt)} className={`ml-2 ${(q.locked_choices || []).includes(opt) ? 'text-[var(--color-cyc-primary)]' : 'text-gray-300 hover:text-gray-500 dark:text-slate-500'} ${language !== 'en' || isLocked ? 'hidden' : ''}`} title="Lock Option Position">
                          {(q.locked_choices || []).includes(opt) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        {optionsArray.length > 1 && (
                          <button type="button" onClick={() => removeOption(q.id, oIdx)} className={`text-gray-400 dark:text-slate-500 hover:text-red-500 ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(q.id)} className={`text-sm text-[var(--color-cyc-primary)] hover:underline mt-2 inline-block ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
                      + Add Option
                    </button>
                  </div>
                )}

                {/* Section Header: Description + Attachments */}
                {q.type === 'section_header' && (
                  <div className="space-y-3 ml-10 pr-28">
                    <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-600 dark:text-slate-400">Section Description</label>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-500 dark:text-slate-500">Alignment:</label>
                      <select value={q.description_alignment || 'left'} onChange={(e) => updateQuestion(q.id, 'description_alignment', e.target.value)} className="text-xs border rounded p-1 focus:outline-none">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="justify">Justify</option>
                      </select>
                    </div>
                  </div>
                      <RichTextEditor
                        value={language === 'en' ? (q.section_description || '') : (q.section_description_fr || '')}
                        onChange={(val) => updateQuestion(q.id, language === 'en' ? 'section_description' : 'section_description_fr', val)}
                        readOnly={isLocked && language === 'en'}
                        placeholder={language === 'en' ? "Provide context or instructions before the next set of questions..." : "Traduction française du contexte..."}
                      />
                    </div>
                    <div className={language !== 'en' || isLocked ? 'hidden' : ''}>
                      <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">Attachments</label>
                      {(q.attachments || []).map((att, aIdx) => (
                        <div key={aIdx} className="flex items-center space-x-2 mb-2 bg-white dark:bg-slate-800 p-2 rounded border text-sm">
                          {att.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-green-500" /> : <FileText className="w-4 h-4 text-blue-500" />}
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex-grow truncate">{att.name}</a>
                          <button type="button" onClick={() => removeAttachment(q.id, aIdx)} className="text-red-400 hover:text-red-600">&times;</button>
                        </div>
                      ))}
                      <label className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-dashed border-gray-300 dark:border-slate-600 rounded cursor-pointer hover:border-[var(--color-cyc-primary)] transition-colors text-sm">
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-gray-500 dark:text-slate-500" />
                        <span className="text-gray-600 dark:text-slate-400">Add File (PDF, PNG, JPEG)</span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf" onChange={(e) => handleAttachmentUpload(q.id, e)} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

              {/* Definitions Section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Interactive Definitions</h4>
                  <button type="button" onClick={() => addDefinition(q.id)} className={`text-xs text-[var(--color-cyc-primary)] hover:underline ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
                    + Add Definition
                  </button>
                </div>
                {q.definitions && q.definitions.length > 0 && (
                  <div className="space-y-2">
                    {(language === 'en' ? q.definitions : (q.definitions_fr || q.definitions)).map((def, dIdx) => (
                      <div key={dIdx} className="flex items-start space-x-2">
                        <div className="w-1/3">
                          <input
                            type="text"
                            placeholder={language === 'fr' ? (q.definitions![dIdx]?.term || "Terme") : "Term"}
                            value={def.term}
                            onChange={(e) => updateDefinition(q.id, dIdx, 'term', e.target.value)}
                            className={`w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none ${language === 'fr' ? 'border-blue-200' : ''}`}
                          />
                        </div>
                        <div className="flex-grow">
                          <textarea
                            placeholder={language === 'fr' ? (q.definitions![dIdx]?.definition || "Définition") : "Definition"}
                            value={def.definition}
                            onChange={(e) => updateDefinition(q.id, dIdx, 'definition', e.target.value)}
                            rows={1}
                            className={`w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none resize-none ${language === 'fr' ? 'border-blue-200' : ''}`}
                          />
                        </div>
                        <button type="button" onClick={() => removeDefinition(q.id, dIdx)} className={`p-1.5 text-gray-400 hover:text-red-500 ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logic Gating Section */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Logic Gating (Display Conditions)</h4>
                  <div className="flex items-center space-x-2">
                    {q.logic_gates && q.logic_gates.length > 1 && (
                      <select 
                        value={q.logic_gate_match_type || 'all'} 
                        onChange={(e) => updateQuestion(q.id, 'logic_gate_match_type', e.target.value)}
                        className={`text-xs border rounded p-1 focus:outline-none ${language !== 'en' || isLocked ? 'hidden' : ''}`}
                      >
                        <option value="all">Match ALL conditions</option>
                        <option value="any">Match ANY condition</option>
                      </select>
                    )}
                    <button type="button" onClick={() => addLogicGate(q.id)} className={`text-xs text-[var(--color-cyc-primary)] hover:underline ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
                      + Add Condition
                    </button>
                  </div>
                </div>
                {q.logic_gates && q.logic_gates.length > 0 && (
                  <div className="space-y-2">
                    {q.logic_gates.map((gate, gIdx) => (
                      <div key={gIdx} className="flex items-start space-x-2 p-2 bg-gray-50 dark:bg-slate-800 rounded">
                        <div className="flex-grow flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <select 
                            value={gate.question_id} 
                            onChange={(e) => updateLogicGate(q.id, gIdx, 'question_id', e.target.value)}
                            disabled={language !== 'en' || isLocked}
                            className="w-full sm:w-1/2 p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                          >
                            <option value="">-- Select Question --</option>
                            {questions.slice(0, qIdx).filter(prevQ => prevQ.type === 'multiple_choice' || prevQ.type === 'checkboxes' || prevQ.type === 'dropdown').map(prevQ => (
                              <option key={prevQ.id} value={prevQ.id}>{prevQ.question_text || `Question ${questions.indexOf(prevQ) + 1}`}</option>
                            ))}
                          </select>
                          <select 
                            value={gate.value} 
                            onChange={(e) => updateLogicGate(q.id, gIdx, 'value', e.target.value)}
                            disabled={language !== 'en' || isLocked || !gate.question_id}
                            className="w-full sm:w-1/2 p-1.5 text-sm border rounded focus:ring-1 focus:ring-[var(--color-cyc-primary)] focus:outline-none"
                          >
                            <option value="">-- Requires Answer --</option>
                            {gate.question_id && questions.find(pq => pq.id === gate.question_id) ? getOptionsArray(questions.find(pq => pq.id === gate.question_id)?.options).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            )) : null}
                          </select>
                        </div>
                        <button type="button" onClick={() => removeLogicGate(q.id, gIdx)} className={`p-1.5 text-gray-400 hover:text-red-500 ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
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

          <div className={`bg-gray-50 dark:bg-slate-900/50 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center ${language !== 'en' || isLocked ? 'hidden' : ''}`}>
            <p className="text-gray-500 dark:text-slate-500 mb-4">Add a new question to this survey</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => addQuestion('section_header')} className="px-4 py-2 bg-yellow-50 border border-yellow-300 rounded shadow-sm hover:border-[var(--color-cyc-accent)] transition-colors text-sm font-medium text-yellow-700">
                § Section Header
              </button>
              <button type="button" onClick={() => addQuestion('multiple_choice')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Multiple Choice
              </button>
              <button type="button" onClick={() => addQuestion('ranking')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Ranking
              </button>
              <button type="button" onClick={() => addQuestion('checkboxes')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Checkboxes
              </button>
              <button type="button" onClick={() => addQuestion('dropdown')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Dropdown
              </button>
              <button type="button" onClick={() => addQuestion('rating_scale')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Percentage Slider (0-100)
              </button>
              <button type="button" onClick={() => addQuestion('likert_scale')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Likert Scale (1-5)
              </button>
              <button type="button" onClick={() => addQuestion('short_answer')} className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors text-sm font-medium text-gray-700 dark:text-slate-300">
                Short Answer
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-slate-700">
          <Link href="/admin" className="px-6 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:text-slate-100 font-medium mr-4">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary flex items-center">
            {submitting ? 'Saving...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Update Survey
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
