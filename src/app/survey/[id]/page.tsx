'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ArrowRight, CheckCircle2, FileText, Download } from 'lucide-react';
import parse, { type DOMNode, Text as TextNode } from 'html-react-parser';
import { useLanguage } from '@/contexts/LanguageContext';

interface Attachment {
  url: string;
  name: string;
  type?: string;
}

interface LogicGate {
  question_id?: string;
  value?: string;
}

interface QuestionOptions {
  choices?: string[];
  has_other?: boolean;
  max_selections?: number;
  has_calculator?: boolean;
  reference_number?: boolean;
  description?: string;
  attachments?: Attachment[];
  randomize_options?: boolean;
  locked_choices?: string[];
  description_alignment?: string;
  definitions?: { term: string; definition: string }[];
  validation?: {
    type?: string;
    max_length?: number;
    regex?: string;
    normalize_uppercase?: boolean;
  };
  logic_gates?: LogicGate[];
  logic_gate_match_type?: string;
  [key: string]: unknown;
}

interface Question {
  id: string;
  type: string;
  question_text: string;
  is_required?: boolean;
  is_conditional?: boolean;
  options?: QuestionOptions | string[] | unknown;
}

interface Survey {
  id: string;
  title: string;
  title_fr?: string;
  title_zh?: string;
  description?: string;
  description_fr?: string;
  description_zh?: string;
  estimated_minutes?: number;
  description_alignment?: string;
  questions: Question[];
  questions_fr?: Question[];
  questions_zh?: Question[];
  referral_source?: string;
}

const RichTextRenderer = ({
  text,
  definitions,
}: {
  text: string;
  definitions?: { term: string; definition: string }[];
}) => {
  if (!text) return null;
  if (!definitions || definitions.length === 0) return <>{parse(text)}</>;

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sortedDefs = [...definitions].sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(
    `\\b(${sortedDefs.map((d) => escapeRegExp(d.term)).join('|')})\\b`,
    'gi'
  );

  const isTextNode = (node: DOMNode): node is TextNode => node.type === 'text';

  const options = {
    replace: (domNode: DOMNode) => {
      if (isTextNode(domNode)) {
        const parts = domNode.data.split(pattern);
        if (parts.length === 1) return undefined; // No match, let parser handle it

        return (
          <>
            {parts.map((part: string, i: number) => {
              const def = sortedDefs.find((d) => d.term.toLowerCase() === part.toLowerCase());
              if (def) {
                return (
                  <span key={i} className="relative inline-block group cursor-help mx-1">
                    <span className="wavy-underline">{part}</span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm rounded-lg shadow-xl z-50 text-center font-normal tracking-normal leading-normal">
                      {def.definition}
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-slate-100"></span>
                    </span>
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </>
        );
      }
    },
  };

  return <>{parse(text, options)}</>;
};

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t } = useLanguage();
  const referralSource =
    searchParams.get('ref') ||
    (typeof window !== 'undefined' ? localStorage.getItem('global_ref') : null) ||
    null;
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = email, 1+ = questions
  const [email, setEmail] = useState('');
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [refNumbers, setRefNumbers] = useState<Record<string, number | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [inactivityTriggered, setInactivityTriggered] = useState(false);
  const [inactivityChecksShown, setInactivityChecksShown] = useState(0);
  const [questionEnterTime, setQuestionEnterTime] = useState<number>(Date.now());
  const [timeSpentAccumulator, setTimeSpentAccumulator] = useState<Record<string, number>>({});

  // Track previous language so we can remap choice-based answers when the user switches languages
  const prevLanguageRef = useRef(language);

  // Inactivity tracking
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      if (currentStep > 0 && !inactivityTriggered && inactivityChecksShown < 1) {
        timeout = setTimeout(() => {
          setInactivityTriggered(true);
        }, 60000);
      }
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [currentStep, inactivityTriggered, inactivityChecksShown]);

  // Remap choice-based answers when the user switches languages while the survey is mounted
  useEffect(() => {
    if (!survey || language === prevLanguageRef.current) return;
    const oldLang = prevLanguageRef.current;

    setAnswers((prevAnswers) => {
      const remapped = remapAnswers(prevAnswers, oldLang, language, survey);
      return remapped;
    });

    prevLanguageRef.current = language;
  }, [language, survey]);

  // Reset all per-survey state whenever the survey ID changes
  useEffect(() => {
    setSurvey(null);
    setAlreadyCompleted(false);
    setHasStarted(false);
    setCurrentStep(0);
    setEmail('');
    setProfileData({});
    setSessionId(null);
    setAnswers({});
    setOtherTexts({});
    setRefNumbers({});
    setLoading(true);
    setSubmitting(false);
    setError('');
    setInactivityTriggered(false);
    setInactivityChecksShown(0);
    setQuestionEnterTime(Date.now());
    setTimeSpentAccumulator({});

    // Initialize email from URL or global cache
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      setEmail(urlEmail);
    } else {
      const globalEmail = localStorage.getItem('cyc_global_email');
      if (globalEmail) setEmail(globalEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (email) {
      fetch(`/api/user/profile-data?email=${encodeURIComponent(email)}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => setProfileData(data || {}))
        .catch((err) => console.error('Failed to fetch profile data', err));
    }
  }, [email]);

  useEffect(() => {
    if (survey && profileData && Object.keys(profileData).length > 0) {
      setAnswers((prev) => {
        const newAnswers = { ...prev };
        let changed = false;
        survey.questions.forEach((q) => {
          if (newAnswers[q.id] === undefined && profileData[q.question_text]) {
            const pAns = profileData[q.question_text] as Record<string, unknown>;
            let val = undefined;
            if (pAns.answer_options !== null && pAns.answer_options !== undefined) val = pAns.answer_options;
            else if (pAns.answer_text !== null && pAns.answer_text !== undefined) val = pAns.answer_text;
            else if (pAns.answer_numeric !== null && pAns.answer_numeric !== undefined) val = pAns.answer_numeric;

            if (val !== undefined && val !== null) {
              newAnswers[q.id] = val;
              changed = true;
            }
          }
        });
        return changed ? newAnswers : prev;
      });
    }
  }, [survey, profileData]);

  useEffect(() => {
    if (!params.id) return;

    Promise.all([
      fetch(`/api/surveys/${params.id}`).then((r) => {
        if (!r.ok) throw new Error('Survey not found');
        return r.json();
      }),
      fetch(`/api/surveys/${params.id}/translation`)
        .then((r) => r.json())
        .catch(() => ({ questions_fr: null, questions_zh: null })),
    ])
      .then(([data, translationData]) => {
        const completedSurveys = JSON.parse(localStorage.getItem('cyc_completed_surveys') || '[]');
        if (completedSurveys.includes(data.id)) {
          setAlreadyCompleted(true);
        }

        if (translationData?.questions_fr !== undefined) {
          data.questions_fr = translationData.questions_fr;
        }
        if (translationData?.title_fr !== undefined) {
          data.title_fr = translationData.title_fr;
        }
        if (translationData?.description_fr !== undefined) {
          data.description_fr = translationData.description_fr;
        }
        if (translationData?.questions_zh !== undefined) {
          data.questions_zh = translationData.questions_zh;
        }
        if (translationData?.title_zh !== undefined) {
          data.title_zh = translationData.title_zh;
        }
        if (translationData?.description_zh !== undefined) {
          data.description_zh = translationData.description_zh;
        }

        setSurvey(data);

        // Handle attention check injections
        let finalQuestions = [...(data.questions || [])];
        let loadedSaved = false;

        // Auto-resume from localStorage if present
        const savedSession = localStorage.getItem(`cyc_session_${data.id}`);
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            if (parsed.sessionId) {
              const savedLang = parsed.answerLanguage || 'en';
              let restoredAnswers = parsed.answers || {};
              // If the survey was saved in a different language, remap choice answers
              // so they match the currently selected language's option texts
              if (savedLang !== language) {
                restoredAnswers = remapAnswers(restoredAnswers, savedLang, language, data);
              }
              setSessionId(parsed.sessionId);
              setEmail(parsed.email || '');
              setAnswers(restoredAnswers);
              setOtherTexts(parsed.otherTexts || {});
              setRefNumbers(parsed.refNumbers || {});
              setCurrentStep(parsed.currentStep !== undefined ? parsed.currentStep : 1);
              if (parsed.inactivityChecksShown)
                setInactivityChecksShown(parsed.inactivityChecksShown);
              if (parsed.injectedQuestions) {
                finalQuestions = parsed.injectedQuestions;
              }
              setHasStarted(true);
              loadedSaved = true;
            }
          } catch (e) {
            console.error('Failed to parse cached session', e);
          }
        }

        if (!loadedSaved && finalQuestions.length > 3) {
          const total = finalQuestions.length;
          const p1 = Math.floor(total * 0.25);
          const p2 = Math.floor(total * 0.5);
          const p3 = Math.floor(total * 0.75);

          const q1Index = p1 + Math.floor(Math.random() * Math.max(1, p2 - p1));
          const q2Index = p2 + Math.floor(Math.random() * Math.max(1, p3 - p2));

          const attn1 = {
            id: 'attn-fixed-1',
            type: 'likert_scale',
            question_text:
              '<span class="text-sm md:text-base font-normal text-gray-500 dark:text-slate-400 block mb-4">When answering questions about housing and economic policy, it is important to read each statement carefully. To demonstrate that you are paying attention, please select the response option "4 (Agree)" for this specific question.</span>How strongly do you agree or disagree with the timeline of current federal infrastructure projects?',
            is_required: true,
            options: {},
          };
          const attn2 = {
            id: 'attn-fixed-2',
            type: 'multiple_choice',
            question_text:
              '<span class="text-sm md:text-base font-normal text-gray-500 dark:text-slate-400 block mb-4">To ensure our data quality standards are met for this study, please answer the following straightforward statement:</span>"The government of Canada has officially dissolved the country\'s currency and banned the exchange of all goods and services."',
            is_required: true,
            options: { choices: ['True', 'False'] },
          };

          finalQuestions.splice(q2Index, 0, attn2);
          finalQuestions.splice(q1Index, 0, attn1);
        }

        setSurvey({ ...data, questions: finalQuestions });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching survey', err);
        setError('Survey not found or unavailable.');
        setLoading(false);
      });
  }, [params.id]);

  // Sync state changes to localStorage for robust resume support
  useEffect(() => {
    if (survey && sessionId) {
      localStorage.setItem(
        `cyc_session_${survey.id}`,
        JSON.stringify({
          sessionId,
          email,
          answers,
          otherTexts,
          refNumbers,
          currentStep,
          injectedQuestions: survey.questions,
          inactivityChecksShown,
          answerLanguage: language,
        })
      );
    }
  }, [survey, sessionId, email, answers, otherTexts, refNumbers, currentStep, language]);

  // Auto-save the active question's answer to the database in the background on change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  // Auto-advance for simple section headers
  useEffect(() => {
    const isEmailStep = survey ? currentStep === survey.questions.length : false;
    const currentQ = survey && !isEmailStep ? survey.questions[currentStep] : null;
    if (!isEmailStep && currentQ?.type === 'section_header') {
      const opts = getOpts(currentQ);
      if (!opts.description && (!opts.attachments || opts.attachments.length === 0)) {
        const timer = setTimeout(() => {
          handleNext();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStep, survey]);

  useEffect(() => {
    if (survey && sessionId && currentStep > 0) {
      const currentQuestion = survey.questions[currentStep - 1];
      if (
        currentQuestion &&
        !currentQuestion.id.startsWith('attn-')
      ) {
        const val = answers[currentQuestion.id];
        if (val !== undefined) {
          const currentSessionTime = Date.now() - questionEnterTime;
          const body: Record<string, unknown> = {
            question_id: currentQuestion.id,
            time_spent: Math.floor(
              (timeSpentAccumulator[currentQuestion.id] || 0) + currentSessionTime
            ),
          };
          if (
            currentQuestion.type === 'multiple_choice' ||
            currentQuestion.type === 'short_answer'
          ) {
            body.answer_text = val;
          } else if (
            currentQuestion.type === 'rating_scale' ||
            currentQuestion.type === 'likert_scale'
          ) {
            body.answer_numeric = val;
          } else if (currentQuestion.type === 'checkboxes' || currentQuestion.type === 'ranking') {
            body.answer_options = val;
          } else if (currentQuestion.type === 'section_header') {
            body.answer_text = 'viewed';
          }

          // Debounce text area auto-save to avoid spamming the DB on every single keystroke
          const delay = currentQuestion.type === 'short_answer' ? 1000 : 0;
          const timeout = setTimeout(() => {
            fetch(`/api/sessions/${sessionId}/answers`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }).catch(() => {});
          }, delay);

          return () => clearTimeout(timeout);
        }
      }
    }
  }, [answers, sessionId, currentStep, survey, questionEnterTime, timeSpentAccumulator]);

  const getNextVisibleStep = (startIdx: number, forward: boolean, pData = profileData) => {
    let idx = startIdx;
    if (!survey) return forward ? 0 : -1;
    while (idx >= 0 && idx < survey.questions.length) {
      const q = survey.questions[idx];
      let shouldSkip = false;

      let wasAnsweredPreviously = false;
      if (q && q.is_conditional) {
        wasAnsweredPreviously = survey.questions.some((prevQ, i) => {
          if (i >= idx) return false;
          if (prevQ.question_text !== q.question_text) return false;
          const ans = answers[prevQ.id];
          if (ans === undefined || ans === null || ans === '') return false;
          if (Array.isArray(ans) && ans.length === 0) return false;
          return true;
        });
      }

      if (
        q &&
        q.is_conditional &&
        (wasAnsweredPreviously || (pData && pData[q.question_text]))
      ) {
        shouldSkip = true;
      }

      const qOptions = q?.options as QuestionOptions | undefined;
      if (!shouldSkip && q && qOptions?.logic_gates && qOptions.logic_gates.length > 0) {
        const matchType = qOptions?.logic_gate_match_type || 'all';
        const logicGates = qOptions?.logic_gates || [];

        const gateResults = logicGates.map((gate: LogicGate) => {
          if (!gate.question_id || !gate.value) return true;
          const answer = answers[gate.question_id];

          const dependencyQ = survey.questions.find((x: Question) => x.id === gate.question_id);
          let targetValue = gate.value;
          if (dependencyQ && language !== 'en') {
            const enOptions = Array.isArray(dependencyQ.options)
              ? dependencyQ.options
              : (dependencyQ.options as QuestionOptions | undefined)?.choices || [];
            const optIndex = enOptions.indexOf(gate.value);
            if (optIndex !== -1) {
              if (language === 'fr' && survey.questions_fr) {
                const frQ = survey.questions_fr.find((x: Question) => x.id === gate.question_id);
                const frOpts = Array.isArray(frQ?.options)
                  ? frQ.options
                  : (frQ?.options as QuestionOptions | undefined)?.choices || [];
                if (frOpts[optIndex]) targetValue = frOpts[optIndex];
              } else if (language === 'zh' && survey.questions_zh) {
                const zhQ = survey.questions_zh.find((x: Question) => x.id === gate.question_id);
                const zhOpts = Array.isArray(zhQ?.options)
                  ? zhQ.options
                  : (zhQ?.options as QuestionOptions | undefined)?.choices || [];
                if (zhOpts[optIndex]) targetValue = zhOpts[optIndex];
              }
            }
          }

          if (Array.isArray(answer)) {
            return answer.includes(targetValue);
          } else {
            return answer === targetValue;
          }
        });

        const matched =
          matchType === 'any'
            ? gateResults.some((res: boolean) => res)
            : gateResults.every((res: boolean) => res);
        if (!matched) shouldSkip = true;
      }

      if (shouldSkip) {
        idx = forward ? idx + 1 : idx - 1;
      } else {
        break;
      }
    }
    return idx;
  };

  // --- Derived State (Must be before early returns for hooks) ---
  const totalSteps = survey ? survey.questions.length + 1 : 0;
  const isEmailStep = survey ? currentStep === survey.questions.length : false;

  // Walks forward through all questions with getNextVisibleStep to collect
  // the indices of non-gated questions. O(n^2) worst-case but surveys are small.
  const visibleQuestionIndices = useMemo(() => {
    if (!survey) return [] as number[];
    const indices: number[] = [];
    let idx = getNextVisibleStep(0, true);
    while (idx >= 0 && idx < survey.questions.length) {
      indices.push(idx);
      idx = getNextVisibleStep(idx + 1, true);
    }
    return indices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [survey, answers, language]);

  const visibleCount = visibleQuestionIndices.length;
  const visiblePosition = visibleQuestionIndices.indexOf(currentStep);
  const safeVisiblePosition = visiblePosition >= 0 ? visiblePosition : visibleCount - 1;
  const visibleQuestionIds = useMemo(() => {
    if (!survey) return new Set<string>();
    return new Set(visibleQuestionIndices.map((i) => survey.questions[i]?.id).filter(Boolean));
  }, [survey, visibleQuestionIndices]);

  useEffect(() => {
    if (hasStarted && survey && !isEmailStep) {
      if (!visibleQuestionIndices.includes(currentStep)) {
        if (visibleQuestionIndices.length === 0) {
          setCurrentStep(survey.questions.length);
        } else {
          const nextValid = visibleQuestionIndices.find((idx) => idx >= currentStep);
          if (nextValid !== undefined) {
            setCurrentStep(nextValid);
          } else {
            setCurrentStep(survey.questions.length);
          }
        }
      }
    }
  }, [hasStarted, survey, visibleQuestionIndices, currentStep, isEmailStep]);

  const currentQuestionRaw = survey && !isEmailStep ? survey.questions[currentStep] : null;
  const currentQuestion = useMemo(() => {
    if (!currentQuestionRaw) return null;
    const finalQ = { ...currentQuestionRaw };

    if (language === 'fr' && survey?.questions_fr) {
      const frQ = survey.questions_fr.find((q: Question) => q.id === finalQ.id);
      if (frQ) {
        if (frQ.question_text && frQ.question_text.trim()) finalQ.question_text = frQ.question_text;
        finalQ.options = frQ.options;
      }
    } else if (language === 'zh' && survey?.questions_zh) {
      const zhQ = survey.questions_zh.find((q: Question) => q.id === finalQ.id);
      if (zhQ) {
        if (zhQ.question_text && zhQ.question_text.trim()) finalQ.question_text = zhQ.question_text;
        finalQ.options = zhQ.options;
      }
    }

    // Manually translate injected attention checks
    if (language === 'fr' && finalQ.id.startsWith('attn-')) {
      if (finalQ.id === 'attn-fixed-1') {
        finalQ.question_text =
          '<span class="text-sm md:text-base font-normal text-gray-500 dark:text-slate-400 block mb-4">Lorsque vous répondez à des questions sur la politique économique, il est important de lire attentivement chaque énoncé. Pour démontrer que vous êtes attentif, veuillez sélectionner l\'option de réponse "4 (D\'accord)" pour cette question spécifique.</span>Dans quelle mesure êtes-vous d\'accord ou en désaccord avec le calendrier des projets d\'infrastructure fédéraux actuels ?';
      } else if (finalQ.id === 'attn-fixed-2') {
        finalQ.question_text =
          '<span class="text-sm md:text-base font-normal text-gray-500 dark:text-slate-400 block mb-4">Pour nous assurer que nos normes de qualité des données sont respectées, veuillez répondre à cet énoncé :</span>"Le gouvernement du Canada a officiellement dissous la monnaie du pays et interdit l\'échange de tous biens et services."';
        finalQ.options = { choices: ['Vrai', 'Faux'] };
      } else if (finalQ.id === 'attn-inact-1') {
        finalQ.question_text =
          'Êtes-vous toujours là ? Veuillez sélectionner "Oui" pour continuer.';
        finalQ.options = { choices: ['Non', 'Oui', 'Peut-être'] };
      }
    } else if (language === 'zh' && finalQ.id.startsWith('attn-')) {
      if (finalQ.id === 'attn-fixed-1') {
        finalQ.question_text =
          '<span class="text-sm md:text-base font-normal text-gray-500 dark:text-slate-400 block mb-4">在回答有关住房和经济政策的问题时，仔细阅读每项声明非常重要。为了表明您正在集中注意力，请在此特定问题中选择“4（同意）”选项。</span>您对当前联邦基础设施项目时间表的同意或不同意程度如何？';
      } else if (finalQ.id === 'attn-fixed-2') {
        finalQ.question_text =
          '<span class="text-sm md:text-base font-normal text-gray-500 dark:text-slate-400 block mb-4">为确保我们的数据质量标准得到满足，请回答以下简单的声明：</span>“加拿大政府已正式解散该国货币并禁止所有商品和服务的交换。”';
        finalQ.options = { choices: ['正确', '错误'] };
      } else if (finalQ.id === 'attn-inact-1') {
        finalQ.question_text = '您还在吗？请选择“是”以继续。';
        finalQ.options = { choices: ['否', '是', '也许'] };
      }
    }
    return finalQ;
  }, [currentQuestionRaw, language, survey]);

  const progress = isEmailStep
    ? 100
    : survey && visibleCount > 0
      ? (safeVisiblePosition / Math.max(1, visibleCount - 1)) * 100
      : 0;
  const displayTitle =
    language === 'fr' && survey?.title_fr
      ? survey.title_fr
      : language === 'zh' && survey?.title_zh
        ? survey.title_zh
        : survey?.title;
  const displayDescription =
    language === 'fr' && survey?.description_fr
      ? survey.description_fr
      : language === 'zh' && survey?.description_zh
        ? survey.description_zh
        : survey?.description;

  // Helper to shuffle array (Fisher-Yates)
  const shuffleArray = (array: string[]) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Get the translated version of a question for a given language
  const getTranslatedQuestion = (q: Question, lang: string, surveyData: Survey) => {
    if (lang === 'en') return q;
    const translatedList = lang === 'fr' ? surveyData.questions_fr : surveyData.questions_zh;
    if (!translatedList) return q;
    return translatedList.find((tq: Question) => tq.id === q.id) || q;
  };

  // Remap choice-based answers from one language to another so selections survive language switches
  const remapAnswers = (
    existingAnswers: Record<string, unknown>,
    fromLang: string,
    toLang: string,
    surveyData: Survey
  ): Record<string, unknown> => {
    if (fromLang === toLang) return existingAnswers;

    const newAnswers = { ...existingAnswers };
    let changed = false;

    (surveyData.questions || []).forEach((q: Question) => {
      const answer = existingAnswers[q.id];
      if (answer === undefined || answer === null) return;

      // Attention checks have hardcoded translations — handle them separately
      if (q.id?.startsWith('attn-')) {
        const map: Record<string, Record<string, string>> = {
          'attn-fixed-2': { True: 'Vrai', False: 'Faux' },
          'attn-inact-1': { No: 'Non', Yes: 'Oui', Maybe: 'Peut-être' },
        };
        const zhMap: Record<string, Record<string, string>> = {
          'attn-fixed-2': { True: '正确', False: '错误' },
          'attn-inact-1': { No: '否', Yes: '是', Maybe: '也许' },
        };

        if (q.type === 'multiple_choice' || q.type === 'dropdown') {
          if (typeof answer === 'string') {
            let mapped: string | undefined;
            if (toLang === 'fr') mapped = map[q.id]?.[answer];
            else if (toLang === 'zh') mapped = zhMap[q.id]?.[answer];
            else if (fromLang !== 'en') {
              // Mapping back to English — reverse lookup
              const revMap = Object.fromEntries(
                Object.entries(map[q.id] || {}).map(([k, v]) => [v, k])
              );
              const revZhMap = Object.fromEntries(
                Object.entries(zhMap[q.id] || {}).map(([k, v]) => [v, k])
              );
              mapped = revMap[answer] ?? revZhMap[answer];
            }
            if (mapped !== undefined) {
              newAnswers[q.id] = mapped;
              changed = true;
            }
          }
        }
        return;
      }

      if (
        q.type !== 'multiple_choice' &&
        q.type !== 'checkboxes' &&
        q.type !== 'dropdown' &&
        q.type !== 'ranking'
      ) {
        return;
      }

      const fromQ = getTranslatedQuestion(q, fromLang, surveyData);
      const toQ = getTranslatedQuestion(q, toLang, surveyData);
      const fromOpts = getOpts(fromQ).choices;
      const toOpts = getOpts(toQ).choices;

      if (!fromOpts.length || !toOpts.length || fromOpts.length !== toOpts.length) return;

      if (q.type === 'multiple_choice' || q.type === 'dropdown') {
        if (typeof answer === 'string') {
          if (answer.startsWith('Other: ')) return; // user-typed text, keep as-is
          const idx = fromOpts.indexOf(answer);
          if (idx !== -1 && idx < toOpts.length) {
            newAnswers[q.id] = toOpts[idx];
            changed = true;
          }
        }
      } else if (q.type === 'checkboxes') {
        if (Array.isArray(answer)) {
          const newArr = answer.map((val: string) => {
            if (val.startsWith('Other: ')) return val;
            const idx = fromOpts.indexOf(val);
            if (idx !== -1 && idx < toOpts.length) return toOpts[idx];
            return val;
          });
          if (JSON.stringify(newArr) !== JSON.stringify(answer)) {
            newAnswers[q.id] = newArr;
            changed = true;
          }
        }
      } else if (q.type === 'ranking') {
        if (Array.isArray(answer)) {
          const newArr = answer.map((val: string) => {
            const idx = fromOpts.indexOf(val);
            if (idx !== -1 && idx < toOpts.length) return toOpts[idx];
            return val;
          });
          if (JSON.stringify(newArr) !== JSON.stringify(answer)) {
            newAnswers[q.id] = newArr;
            changed = true;
          }
        }
      }
    });

    return changed ? newAnswers : existingAnswers;
  };

  // Helper to get options config
  function getOpts(q: Question | null) {
    if (!q?.options)
      return {
        choices: [],
        has_other: false,
        max_selections: undefined,
        has_calculator: false,
        description: '',
        attachments: [],
        randomize_options: false,
        locked_choices: [],
        description_alignment: 'left',
        definitions: [],
        validation: undefined,
      };
    if (Array.isArray(q.options))
      return {
        choices: q.options as string[],
        has_other: false,
        max_selections: undefined,
        has_calculator: false,
        description: '',
        attachments: [],
        randomize_options: false,
        locked_choices: [],
        description_alignment: 'left',
        definitions: [],
        validation: undefined,
      };
    const opts = q.options as QuestionOptions;
    return {
      choices: opts.choices || [],
      has_other: opts.has_other || false,
      max_selections: opts.max_selections,
      has_calculator: opts.has_calculator || opts.reference_number ? true : false,
      description: opts.description || '',
      attachments: opts.attachments || [],
      randomize_options: opts.randomize_options || false,
      locked_choices: opts.locked_choices || [],
      description_alignment: opts.description_alignment || 'left',
      definitions: opts.definitions || [],
      validation: opts.validation || undefined,
    };
  }

  const opts = currentQuestion ? getOpts(currentQuestion) : getOpts(null);

  // Memoized shuffled choices to prevent re-shuffling on every state update
  const displayChoices = useMemo(() => {
    if (!opts.choices || opts.choices.length === 0) return [];
    if (opts.randomize_options) {
      const locked = opts.locked_choices || [];
      const nonLocked = opts.choices.filter((c: string) => !locked.includes(c));
      const shuffledNonLocked = shuffleArray(nonLocked);
      return opts.choices.map((c: string) => (locked.includes(c) ? c : shuffledNonLocked.shift()!));
    }
    return opts.choices;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id, language]);

  useEffect(() => {
    if (
      currentQuestion?.type === 'ranking' &&
      !answers[currentQuestion.id] &&
      displayChoices.length > 0
    ) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: displayChoices }));
    }
  }, [currentQuestion, displayChoices, answers]);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex-1 flex justify-center items-center text-center p-4">
        <h1 className="text-2xl font-bold text-gray-500">{error}</h1>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 w-full max-w-3xl mx-auto text-center h-full">
        <div className="bg-white dark:bg-white/5 dark:backdrop-blur-xl p-8 md:p-12 rounded-2xl shadow-xl border border-gray-200 dark:border-white/10 max-w-2xl w-full">
          <div className="mx-auto flex justify-center items-center w-20 h-20 bg-teal-50 rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-[var(--color-cyc-primary)]" />
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-4">
            {t('Already Completed')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 dark:text-slate-300 leading-relaxed">
            {t('You have already submitted your response for')} <strong>{displayTitle}</strong>.{' '}
            {t('Thank you for participating!')}
          </p>
        </div>
      </div>
    );
  }

  async function handleNext() {
    if (isEmailStep) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert(t('Please enter a valid email address.'));
        return;
      }
      await finishSurvey();
      return;
    }

    if (!isEmailStep && currentQuestion) {
      if (currentQuestion.type === 'section_header') {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: 'viewed' }));
      }
      // Evaluate attention check if applicable
      if (currentQuestion.id.startsWith('attn-')) {
        const val = answers[currentQuestion.id];
        let passed = false;
        if (currentQuestion.id === 'attn-fixed-1' && val === 4) passed = true;
        if (
          currentQuestion.id === 'attn-fixed-2' &&
          (val === 'False' || val === 'Faux' || val === '错误')
        )
          passed = true;
        if (
          currentQuestion.id === 'attn-inact-1' &&
          (val === 'Yes' || val === 'Oui' || val === '是')
        )
          passed = true;

        if (!passed && sessionId) {
          fetch(`/api/sessions/${sessionId}/attention-failure`, { method: 'POST' }).catch(() =>
            console.error('Failed to report attn')
          );
        }
      }

      // Inject inactivity check dynamically
      if (inactivityTriggered && inactivityChecksShown < 1 && survey) {
        const attnInact = {
          id: 'attn-inact-1',
          type: 'multiple_choice',
          question_text: t('Are you still there? Please select "Yes" to continue.'),
          is_required: true,
          options: { choices: [t('No'), t('Yes'), t('Maybe')] },
        };
        const newQs = [...survey.questions];
        newQs.splice(currentStep + 1, 0, attnInact);

        setSurvey((prev: Survey | null) => ({ ...(prev as Survey), questions: newQs }));
        setInactivityChecksShown((prev) => prev + 1);
        setInactivityTriggered(false);
      }

      // Validate required questions before moving
      if (currentQuestion.is_required && currentQuestion.type !== 'section_header') {
        const val = answers[currentQuestion.id];
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0)
        ) {
          alert(t('This question is required. Please provide an answer.'));
          return;
        }
      }

      // Validate short_answer format
      if (currentQuestion.type === 'short_answer' && answers[currentQuestion.id]) {
        const v = opts.validation;
        if (v && v.type && v.type !== 'none') {
          let val = answers[currentQuestion.id];

          // Normalize before validation
          if (v.normalize_uppercase && typeof val === 'string') {
            val = val.toUpperCase();
            setAnswers({ ...answers, [currentQuestion.id]: val });
          }

          if (v.max_length && typeof val === 'string' && val.length > v.max_length) {
            alert(`Answer must be ${v.max_length} characters or fewer.`);
            return;
          }

          if (v.regex && typeof val === 'string') {
            try {
              const regex = new RegExp(v.regex);
              if (!regex.test(val)) {
                alert(
                  t('Please enter exactly 3 characters in the format A1A (letter, number, letter).')
                );
                return;
              }
            } catch {
              console.error('Invalid regex:', v.regex);
            }
          }
        }
      }

      const qId = currentQuestion.id;
      setTimeSpentAccumulator((prev: Record<string, number>) => ({
        ...prev,
        [qId]: (prev[qId] || 0) + (Date.now() - questionEnterTime),
      }));

      const nextStep = getNextVisibleStep(currentStep + 1, true);

      setQuestionEnterTime(Date.now());
      setCurrentStep(nextStep);
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      if (survey && survey.questions[currentStep]) {
        const qId = survey.questions[currentStep].id;
        setTimeSpentAccumulator((prev: Record<string, number>) => ({
          ...prev,
          [qId]: (prev[qId] || 0) + (Date.now() - questionEnterTime),
        }));
      }
      setQuestionEnterTime(Date.now());
      const prevStep = getNextVisibleStep(currentStep - 1, false);
      if (prevStep >= 0) {
        setCurrentStep(prevStep);
      }
    }
  };

  // Map a choice-based answer from the current display language back to English
  // so all database entries are canonical and admin aggregation works correctly.
  const normalizeAnswerToEnglish = (qId: string, value: unknown): unknown => {
    if (language === 'en') return value;
    const q = survey?.questions.find((x: Question) => x.id === qId);
    if (!q) return value;

    // Language-agnostic types — no translation needed
    if (
      q.type === 'short_answer' ||
      q.type === 'rating_scale' ||
      q.type === 'likert_scale' ||
      q.type === 'section_header'
    ) {
      return value;
    }

    // Attention checks have hardcoded translations — map them explicitly
    if (q.id?.startsWith('attn-')) {
      const frMap: Record<string, Record<string, string>> = {
        'attn-fixed-2': { True: 'Vrai', False: 'Faux' },
        'attn-inact-1': { No: 'Non', Yes: 'Oui', Maybe: 'Peut-être' },
      };
      const zhMap: Record<string, Record<string, string>> = {
        'attn-fixed-2': { True: '正确', False: '错误' },
        'attn-inact-1': { No: '否', Yes: '是', Maybe: '也许' },
      };

      if (q.type === 'multiple_choice' || q.type === 'dropdown') {
        if (typeof value === 'string') {
          // Reverse map: translated → English
          if (language === 'fr') {
            const rev = Object.fromEntries(
              Object.entries(frMap[q.id] || {}).map(([k, v]) => [v, k])
            );
            if (rev[value]) return rev[value];
          } else if (language === 'zh') {
            const rev = Object.fromEntries(
              Object.entries(zhMap[q.id] || {}).map(([k, v]) => [v, k])
            );
            if (rev[value]) return rev[value];
          }
        }
      }
      return value;
    }

    // For regular questions, map by option index using the translation data
    const translatedList = language === 'fr' ? survey?.questions_fr : survey?.questions_zh;
    if (!translatedList) return value;
    const transQ = translatedList.find((tq: Question) => tq.id === qId);
    if (!transQ) return value;

    const enOpts = getOpts(q).choices;
    const transOpts = getOpts(transQ).choices;
    if (!enOpts.length || !transOpts.length || enOpts.length !== transOpts.length) return value;

    const mapByIndex = (val: string) => {
      if (val.startsWith('Other: ')) return val;
      const idx = transOpts.indexOf(val);
      if (idx !== -1 && idx < enOpts.length) return enOpts[idx];
      return val;
    };

    if (q.type === 'multiple_choice' || q.type === 'dropdown') {
      if (typeof value === 'string') return mapByIndex(value);
    } else if (q.type === 'checkboxes' || q.type === 'ranking') {
      if (Array.isArray(value)) return value.map(mapByIndex);
    }

    return value;
  };

  const finishSurvey = async () => {
    setSubmitting(true);
    try {
      // 1. Duplicate Prevention Check
      const statusRes = await fetch(`/api/surveys/${survey.id}/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const statusData = await statusRes.json();
      if (statusData.has_submitted) {
        setAlreadyCompleted(true);
        const completedSurveys = JSON.parse(localStorage.getItem('cyc_completed_surveys') || '[]');
        if (!completedSurveys.includes(survey.id)) {
          completedSurveys.push(survey.id);
          localStorage.setItem('cyc_completed_surveys', JSON.stringify(completedSurveys));
        }
        setSubmitting(false);
        return;
      }

      // Save to global email memory
      localStorage.setItem('cyc_global_email', email);

      // Build answers payload (exclude answers for gated-out questions)
      const submissionAnswers = [];
      for (const [qId, val] of Object.entries(answers)) {
        if (!visibleQuestionIds.has(qId)) continue;
        const q = survey.questions.find((x: Question) => x.id === qId);
        if (!q || q.id.startsWith('attn-')) continue;

        const answerObj: Record<string, unknown> = {
          question_id: q.id,
          time_spent: timeSpentAccumulator[qId] || 0,
        };
        if (q.type === 'multiple_choice' || q.type === 'short_answer' || q.type === 'dropdown') {
          answerObj.answer_text = normalizeAnswerToEnglish(qId, val);
        } else if (q.type === 'rating_scale' || q.type === 'likert_scale') {
          answerObj.answer_numeric = val;
        } else if (q.type === 'checkboxes' || q.type === 'ranking') {
          answerObj.answer_options = normalizeAnswerToEnglish(qId, val);
        } else if (q.type === 'section_header') {
          answerObj.answer_text = 'viewed';
        }
        submissionAnswers.push(answerObj);
      }

      // Ensure we fetch the most up-to-date referral source right before submit
      let finalReferralSource = searchParams.get('ref');
      if (!finalReferralSource && typeof window !== 'undefined') {
        finalReferralSource = localStorage.getItem('global_ref');
      }

      // Submit all at once via the legacy responses endpoint
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          answers: submissionAnswers,
          language,
          referral_source: finalReferralSource || survey?.referral_source || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Survey submit failed (HTTP ${res.status}):`, errText);
        throw new Error(
          `${t('Failed to submit response')} (${res.status}: ${errText.slice(0, 200)})`
        );
      }

      const completedSurveys = JSON.parse(localStorage.getItem('cyc_completed_surveys') || '[]');
      if (!completedSurveys.includes(survey.id)) {
        completedSurveys.push(survey.id);
        localStorage.setItem('cyc_completed_surveys', JSON.stringify(completedSurveys));
      }

      // Clear the saved session cache upon successful completion
      localStorage.removeItem(`cyc_session_${survey.id}`);

      router.push('/thank-you');
    } catch (err) {
      console.error('Submission error', err);
      setSubmitting(false);
      alert(t('Failed to submit survey. Please try again.'));
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 },
  };
  const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.4 } as const;

  // Welcome Screen
  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 w-full max-w-3xl mx-auto text-center h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-6 leading-tight">
            {displayTitle}
          </h1>
          <div
            className={`text-lg sm:text-xl text-gray-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed text-${survey.description_alignment || 'left'} [&_p]:mb-4 last:[&_p]:mb-0`}
          >
            {displayDescription ? (
              <RichTextRenderer text={displayDescription} />
            ) : (
              t('Share your voice and help empower Canadian youth.')
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setHasStarted(true);
              if (visibleQuestionIndices.length > 0) {
                setCurrentStep(visibleQuestionIndices[0]);
              } else {
                setCurrentStep(survey.questions.length);
              }
            }}
            className="btn-primary text-xl px-10 py-4 rounded-full shadow-md shadow-teal-500/5 dark:shadow-teal-400/5 hover:shadow-lg transition-all flex items-center justify-center mx-auto"
          >
            {t('Start Survey')} <ArrowRight className="w-6 h-6 ml-3" />
          </motion.button>
          <p className="text-sm text-gray-400 mt-6 font-medium">
            {t('Estimated time:')} {survey.estimated_minutes} {t('minutes')}
          </p>
        </motion.div>
      </div>
    );
  }

  // Survey Form
  return (
    <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 relative min-h-full pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-shrink-0 mb-6 text-center"
      >
        <div className="w-full bg-gray-200 rounded-full h-2 max-w-2xl mx-auto overflow-hidden">
          <motion.div
            className="bg-[var(--color-cyc-primary)] h-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs sm:text-sm font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mt-3">
          {isEmailStep
            ? t('Almost Done!')
            : currentQuestion?.type === 'section_header'
              ? t('Information')
              : visibleCount > 0
                ? `${t('Question')} ${safeVisiblePosition + 1} ${t('of')} ${visibleCount}`
                : ''}
        </p>
      </motion.div>

      <div className="flex-1 flex flex-col bg-white dark:bg-white/5 dark:backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 sm:p-8 shadow-xl relative h-auto min-h-[60vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className={`flex-1 flex flex-col max-w-2xl mx-auto w-full pb-4 pt-4 sm:pt-8 ${currentQuestion?.type === 'section_header' ? 'justify-center my-auto' : 'justify-start'}`}
          >
            {/* EMAIL STEP */}
            {isEmailStep && (
              <>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 text-[var(--color-cyc-secondary)] dark:text-slate-100 text-center leading-snug pt-4">
                  {t('What is your email address?')}
                </h2>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-600 bg-transparent dark:bg-slate-900 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-[var(--color-cyc-primary)]/20 dark:text-white focus:outline-none transition-all text-base sm:text-lg text-center"
                  placeholder="you@example.com"
                />
                <div className="text-center mt-5 px-2 max-w-xl mx-auto space-y-2">
                  <p className="text-sm sm:text-base font-medium text-gray-500 dark:text-slate-400 leading-snug">
                    {t(
                      'A valid email address is required to enter the raffle and to contact participants when the second and third questionnaires are released.'
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                    {t(
                      'Email addresses will remain confidential and will not be shared publicly or used for purposes unrelated to the survey series or raffle administration.'
                    )}
                  </p>
                </div>
              </>
            )}

            {/* QUESTION STEPS */}
            {!isEmailStep && currentQuestion && (
              <>
                <div className="mb-6 sm:mb-8 text-center pt-4 text-xl sm:text-2xl md:text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 leading-snug [&_p]:mb-4 last:[&_p]:mb-0">
                  <RichTextRenderer
                    text={(currentQuestion.question_text || '').replace(/\n\n/g, '<br/><br/>')}
                    definitions={opts.definitions}
                  />
                </div>

                {opts.description && currentQuestion.type !== 'section_header' && (
                  <div className="mb-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-slate-400 italic leading-relaxed max-w-xl mx-auto">
                      {opts.description}
                    </p>
                  </div>
                )}

                <div className="w-full">
                  {/* SECTION HEADER */}
                  {currentQuestion.type === 'section_header' && (
                    <div className="space-y-4">
                      {opts.description && (
                        <div
                          className={`text-base text-gray-600 dark:text-slate-400 dark:text-slate-300 leading-relaxed text-${opts.description_alignment || 'left'}`}
                        >
                          <RichTextRenderer
                            text={opts.description.replace(/\n/g, '<br/>')}
                            definitions={opts.definitions}
                          />
                        </div>
                      )}
                      {opts.attachments.length > 0 && (
                        <div className="space-y-3 mt-4">
                          {opts.attachments.map((att: Attachment, i: number) => (
                            <div key={i}>
                              {att.type?.startsWith('image/') ? (
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="rounded-lg border border-gray-200 max-w-full max-h-96 mx-auto"
                                />
                              ) : (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                  <FileText className="w-5 h-5 text-blue-500 mr-3 flex-shrink-0" />
                                  <span className="text-sm font-medium text-blue-600 truncate flex-grow">
                                    {att.name}
                                  </span>
                                  <Download className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DROPDOWN */}
                  {currentQuestion.type === 'dropdown' && (
                    <div className="w-full">
                      <select
                        value={(answers[currentQuestion.id] as string | undefined) || ''}
                        onChange={(e) =>
                          setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                        }
                        className="w-full p-3 sm:p-4 border-2 border-gray-200 dark:border-slate-600 bg-transparent dark:bg-slate-900 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-[var(--color-cyc-primary)]/20 dark:text-white focus:outline-none transition-all text-base sm:text-lg bg-white dark:bg-white/5 cursor-pointer"
                      >
                        <option value="" disabled>
                          {t('Select an option...')}
                        </option>
                        {displayChoices.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* MULTIPLE CHOICE */}
                  {currentQuestion.type === 'multiple_choice' && (
                    <div className="space-y-3 sm:space-y-4">
                      {displayChoices.map((opt: string) => (
                        <label
                          key={opt}
                          className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${answers[currentQuestion.id] === opt ? 'border-[var(--color-cyc-primary)] bg-teal-50/50 dark:bg-[var(--color-cyc-primary)]/10 dark:border-[var(--color-cyc-primary)]' : 'border-gray-100 dark:border-white/5 hover:border-teal-200 dark:hover:border-white/15 bg-white dark:bg-white/5'}`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={opt}
                            checked={answers[currentQuestion.id] === opt}
                            onChange={(e) =>
                              setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded-full border-2 mr-3 sm:mr-4 flex-shrink-0 flex items-center justify-center ${answers[currentQuestion.id] === opt ? 'border-[var(--color-cyc-primary)]' : 'border-gray-300'}`}
                          >
                            {answers[currentQuestion.id] === opt && (
                              <div className="w-2.5 h-2.5 bg-[var(--color-cyc-primary)] rounded-full" />
                            )}
                          </div>
                          <span className="text-base sm:text-lg font-medium text-gray-700 dark:text-slate-200">
                            {opt}
                          </span>
                        </label>
                      ))}
                      {opts.has_other && (
                        <label
                          className={`flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${(answers[currentQuestion.id] as string | undefined)?.startsWith('Other: ') ? 'border-[var(--color-cyc-primary)] bg-teal-50/50 dark:bg-[var(--color-cyc-primary)]/10 dark:border-[var(--color-cyc-primary)]' : 'border-gray-100 dark:border-white/5 hover:border-teal-200 dark:hover:border-white/15 bg-white dark:bg-white/5'}`}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value="__other__"
                            checked={
                              !!(answers[currentQuestion.id] as string | undefined)?.startsWith(
                                'Other: '
                              )
                            }
                            onChange={() =>
                              setAnswers({
                                ...answers,
                                [currentQuestion.id]: `Other: ${otherTexts[currentQuestion.id] || ''}`,
                              })
                            }
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded-full border-2 mr-3 sm:mr-4 flex-shrink-0 flex items-center justify-center ${!!(answers[currentQuestion.id] as string | undefined)?.startsWith('Other: ') ? 'border-[var(--color-cyc-primary)]' : 'border-gray-300'}`}
                          >
                            {!!(answers[currentQuestion.id] as string | undefined)?.startsWith(
                              'Other: '
                            ) && (
                              <div className="w-2.5 h-2.5 bg-[var(--color-cyc-primary)] rounded-full" />
                            )}
                          </div>
                          <span className="text-base font-medium text-gray-700 dark:text-slate-200 mr-2">
                            {t('Other:')}
                          </span>
                          <input
                            type="text"
                            value={otherTexts[currentQuestion.id] || ''}
                            onChange={(e) => {
                              setOtherTexts({
                                ...otherTexts,
                                [currentQuestion.id]: e.target.value,
                              });
                              if (
                                (answers[currentQuestion.id] as string | undefined)?.startsWith(
                                  'Other: '
                                )
                              ) {
                                setAnswers({
                                  ...answers,
                                  [currentQuestion.id]: `Other: ${e.target.value}`,
                                });
                              }
                            }}
                            onFocus={() =>
                              setAnswers({
                                ...answers,
                                [currentQuestion.id]: `Other: ${otherTexts[currentQuestion.id] || ''}`,
                              })
                            }
                            className="flex-grow border-b border-gray-300 focus:border-[var(--color-cyc-primary)] focus:outline-none px-1 py-0.5 bg-transparent"
                            placeholder={t('Type your answer')}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* RATING SCALE with calculator */}
                  {currentQuestion.type === 'rating_scale' && (
                    <div className="py-8 px-4 sm:px-8 flex flex-col items-center">
                      <div className="text-4xl sm:text-5xl font-extrabold text-[var(--color-cyc-primary)] mb-2">
                        {answers[currentQuestion.id] !== undefined
                          ? (answers[currentQuestion.id] as number)
                          : 50}
                        %
                      </div>
                      {opts.has_calculator && refNumbers[currentQuestion.id] !== undefined && (
                        <div className="text-lg font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-2">
                          {Math.round(
                            (((answers[currentQuestion.id] as number | undefined) !== undefined
                              ? (answers[currentQuestion.id] as number)
                              : 50) /
                              100) *
                              (refNumbers[currentQuestion.id] || 0)
                          )}{' '}
                          {t('out of')} {refNumbers[currentQuestion.id]}
                        </div>
                      )}
                      {opts.has_calculator && (
                        <div className="mb-4 flex items-center space-x-2">
                          <label className="text-sm font-medium text-gray-600 dark:text-slate-400">
                            {t('Enter a number:')}
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={refNumbers[currentQuestion.id] ?? ''}
                            onChange={(e) =>
                              setRefNumbers({
                                ...refNumbers,
                                [currentQuestion.id]: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              })
                            }
                            className="w-28 p-1.5 border-2 border-gray-200 rounded-lg text-center focus:border-[var(--color-cyc-primary)] focus:outline-none font-bold"
                            placeholder={t('e.g. 100')}
                          />
                        </div>
                      )}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={
                          (answers[currentQuestion.id] as number | undefined) !== undefined
                            ? (answers[currentQuestion.id] as number)
                            : 50
                        }
                        onChange={(e) =>
                          setAnswers({ ...answers, [currentQuestion.id]: Number(e.target.value) })
                        }
                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-cyc-primary)]"
                        style={{
                          background: `linear-gradient(to right, var(--color-cyc-primary) ${(answers[currentQuestion.id] as number | undefined) !== undefined ? (answers[currentQuestion.id] as number) : 50}%, #e5e7eb ${(answers[currentQuestion.id] as number | undefined) !== undefined ? (answers[currentQuestion.id] as number) : 50}%)`,
                        }}
                      />
                      <div className="w-full flex justify-between text-sm text-gray-500 mt-4 font-medium">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  )}

                  {/* CHECKBOXES with Other */}
                  {currentQuestion.type === 'checkboxes' && (
                    <div className="space-y-3 sm:space-y-4">
                      {(() => {
                        const maxSelections = opts.max_selections;
                        const currentSelected: string[] =
                          (answers[currentQuestion.id] as string[] | undefined) || [];

                        return (
                          <>
                            {maxSelections && (
                              <p className="text-sm text-gray-500 font-medium mb-3">
                                {t('Select up to')} {maxSelections} {t('options')}
                              </p>
                            )}
                            {displayChoices.map((opt: string) => {
                              const isChecked = currentSelected.includes(opt);
                              const isDisabled =
                                !isChecked &&
                                maxSelections &&
                                currentSelected.length >= maxSelections;
                              return (
                                <label
                                  key={opt}
                                  className={`flex items-center p-3 sm:p-4 border-2 rounded-xl transition-all duration-200 ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5' : 'cursor-pointer hover:shadow-md'} ${isChecked ? 'border-[var(--color-cyc-primary)] bg-teal-50/50 dark:bg-[var(--color-cyc-primary)]/10 dark:border-[var(--color-cyc-primary)]' : !isDisabled ? 'border-gray-100 dark:border-white/5 hover:border-teal-200 dark:hover:border-white/15 bg-white dark:bg-white/5' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    value={opt}
                                    checked={isChecked}
                                    disabled={!!isDisabled}
                                    onChange={(e) => {
                                      if (isDisabled) return;
                                      if (e.target.checked)
                                        setAnswers({
                                          ...answers,
                                          [currentQuestion.id]: [...currentSelected, opt],
                                        });
                                      else
                                        setAnswers({
                                          ...answers,
                                          [currentQuestion.id]: currentSelected.filter(
                                            (item: string) => item !== opt
                                          ),
                                        });
                                    }}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-6 h-6 rounded border-2 mr-3 sm:mr-4 flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-[var(--color-cyc-primary)] border-[var(--color-cyc-primary)]' : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5'}`}
                                  >
                                    {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                                  </div>
                                  <span className="text-base sm:text-lg font-medium text-gray-700 dark:text-slate-200">
                                    {opt}
                                  </span>
                                </label>
                              );
                            })}
                            {opts.has_other &&
                              (() => {
                                const otherVal = currentSelected.find((s: string) =>
                                  s.startsWith('Other: ')
                                );
                                const isChecked = !!otherVal;
                                const isDisabled =
                                  !isChecked &&
                                  maxSelections &&
                                  currentSelected.length >= maxSelections;
                                return (
                                  <label
                                    className={`flex items-center p-3 sm:p-4 border-2 rounded-xl transition-all duration-200 ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5' : 'cursor-pointer hover:shadow-md'} ${isChecked ? 'border-[var(--color-cyc-primary)] bg-teal-50/50 dark:bg-[var(--color-cyc-primary)]/10 dark:border-[var(--color-cyc-primary)]' : !isDisabled ? 'border-gray-100 dark:border-white/5 hover:border-teal-200 dark:hover:border-white/15 bg-white dark:bg-white/5' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!!isDisabled}
                                      onChange={(e) => {
                                        if (isDisabled) return;
                                        if (e.target.checked) {
                                          setAnswers({
                                            ...answers,
                                            [currentQuestion.id]: [
                                              ...currentSelected,
                                              `Other: ${otherTexts[currentQuestion.id] || ''}`,
                                            ],
                                          });
                                        } else {
                                          setAnswers({
                                            ...answers,
                                            [currentQuestion.id]: currentSelected.filter(
                                              (item: string) => !item.startsWith('Other: ')
                                            ),
                                          });
                                        }
                                      }}
                                      className="sr-only"
                                    />
                                    <div
                                      className={`w-6 h-6 rounded border-2 mr-3 sm:mr-4 flex-shrink-0 flex items-center justify-center transition-colors ${isChecked ? 'bg-[var(--color-cyc-primary)] border-[var(--color-cyc-primary)]' : 'border-gray-300 dark:border-white/10 bg-white dark:bg-white/5'}`}
                                    >
                                      {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                    <span className="text-base font-medium text-gray-700 dark:text-slate-200 mr-2">
                                      {t('Other:')}
                                    </span>
                                    <input
                                      type="text"
                                      value={otherTexts[currentQuestion.id] || ''}
                                      onChange={(e) => {
                                        setOtherTexts({
                                          ...otherTexts,
                                          [currentQuestion.id]: e.target.value,
                                        });
                                        if (isChecked) {
                                          setAnswers({
                                            ...answers,
                                            [currentQuestion.id]: [
                                              ...currentSelected.filter(
                                                (s: string) => !s.startsWith('Other: ')
                                              ),
                                              `Other: ${e.target.value}`,
                                            ],
                                          });
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex-grow border-b border-gray-300 focus:border-[var(--color-cyc-primary)] focus:outline-none px-1 py-0.5 bg-transparent"
                                      placeholder={t('Type your answer')}
                                    />
                                  </label>
                                );
                              })()}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* RANKING */}
                  {currentQuestion.type === 'ranking' && (
                    <div className="space-y-3 sm:space-y-4">
                      <p className="text-sm text-gray-500 font-medium mb-3">
                        {t(
                          'Drag and drop the items to rank them in order of preference (1 = Top Preference).'
                        )}
                      </p>
                      <Reorder.Group
                        axis="y"
                        values={
                          (answers[currentQuestion.id] as string[] | undefined) || displayChoices
                        }
                        onReorder={(newOrder) =>
                          setAnswers({ ...answers, [currentQuestion.id]: newOrder })
                        }
                        className="flex flex-col gap-3"
                      >
                        {(
                          (answers[currentQuestion.id] as string[] | undefined) || displayChoices
                        ).map((opt: string, index: number) => (
                          <Reorder.Item
                            key={opt}
                            value={opt}
                            className="relative flex items-center p-3 sm:p-4 border-2 border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900 rounded-xl cursor-grab active:cursor-grabbing hover:shadow-md hover:border-teal-200 transition-colors transition-shadow"
                          >
                            <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-[var(--color-cyc-primary)]/20 flex items-center justify-center mr-4 font-bold text-[var(--color-cyc-primary)]">
                              {index + 1}
                            </div>
                            <span className="text-base sm:text-lg font-medium text-gray-700 dark:text-slate-200 flex-grow">
                              {opt}
                            </span>
                            <div className="text-gray-400">
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 6h16M4 12h16M4 18h16"
                                />
                              </svg>
                            </div>
                          </Reorder.Item>
                        ))}
                      </Reorder.Group>
                    </div>
                  )}

                  {/* LIKERT SCALE */}
                  {currentQuestion.type === 'likert_scale' && (
                    <div className="flex flex-col items-center w-full px-2 sm:px-6 py-6">
                      <div className="flex justify-between w-full mb-6 text-xs sm:text-sm font-bold text-gray-500">
                        <span className="w-1/3 text-left">{t('Strongly Disagree')}</span>
                        <span className="w-1/3 text-center">{t('Neutral')}</span>
                        <span className="w-1/3 text-right">{t('Strongly Agree')}</span>
                      </div>
                      <div className="flex justify-between items-center w-full relative z-0">
                        <div className="absolute top-1/2 left-4 right-4 h-1.5 bg-gray-200 z-0 -translate-y-1/2 rounded-full"></div>
                        {[1, 2, 3, 4, 5].map((val) => (
                          <label
                            key={val}
                            className="flex flex-col items-center cursor-pointer group relative z-10"
                          >
                            <input
                              type="radio"
                              name={currentQuestion.id}
                              value={val}
                              checked={answers[currentQuestion.id] === val}
                              onChange={() => setAnswers({ ...answers, [currentQuestion.id]: val })}
                              className="sr-only"
                            />
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 bg-white dark:bg-white/5 shadow-sm ${answers[currentQuestion.id] === val ? 'border-[var(--color-cyc-primary)] scale-125 shadow-md shadow-teal-100 text-[var(--color-cyc-primary)]' : 'border-gray-300 group-hover:border-teal-200 text-gray-500 group-hover:text-teal-500 group-hover:scale-110'}`}
                            >
                              <span className="text-base sm:text-lg font-extrabold">{val}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SHORT ANSWER */}
                  {currentQuestion.type === 'short_answer' && (
                    <div>
                      {opts.validation?.type && opts.validation.type !== 'none' ? (
                        <>
                          <input
                            type="text"
                            maxLength={opts.validation.max_length || undefined}
                            className="w-full p-4 border-2 border-gray-200 dark:border-slate-600 bg-transparent dark:bg-slate-900 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-[var(--color-cyc-primary)]/20 dark:text-white focus:outline-none transition-all text-base sm:text-lg"
                            placeholder={
                              opts.validation.type === 'postal_code_prefix'
                                ? 'e.g. M5V'
                                : 'Share your thoughts here...'
                            }
                            value={(answers[currentQuestion.id] as string | undefined) || ''}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (opts.validation?.normalize_uppercase) {
                                val = val.toUpperCase();
                              }
                              setAnswers({ ...answers, [currentQuestion.id]: val });
                            }}
                          />
                          {opts.validation.type === 'postal_code_prefix' && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 text-center">
                              Enter the first 3 characters of your postal code (e.g. M5V).
                            </p>
                          )}
                        </>
                      ) : (
                        <textarea
                          rows={4}
                          className="w-full p-4 border-2 border-gray-200 dark:border-slate-600 bg-transparent dark:bg-slate-900 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-[var(--color-cyc-primary)]/20 dark:text-white focus:outline-none transition-all resize-none text-base sm:text-lg"
                          placeholder={t('Share your thoughts here...')}
                          value={(answers[currentQuestion.id] as string | undefined) || ''}
                          onChange={(e) =>
                            setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {!(
              currentQuestion?.type === 'section_header' &&
              !opts.description &&
              (!opts.attachments || opts.attachments.length === 0)
            ) && (
              <div className="flex-shrink-0 flex justify-between items-center mt-auto pt-6 border-t border-gray-100 dark:border-white/5 bg-transparent">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0 || visibleQuestionIndices.length === 0 || visibleQuestionIndices[0] === currentStep}
                  className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all ${(currentStep === 0 || visibleQuestionIndices.length === 0 || visibleQuestionIndices[0] === currentStep) ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 hover:text-gray-900'}`}
                >
                  {t('Back')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  disabled={submitting}
                  className="btn-primary px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl flex items-center text-base sm:text-lg font-bold shadow-md shadow-teal-500/5 dark:shadow-teal-400/5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {submitting
                    ? t('Submitting...')
                    : currentStep === totalSteps - 1
                      ? t('Finish Survey')
                      : isEmailStep
                        ? t('Next')
                        : currentQuestion?.type === 'section_header'
                          ? t('Continue')
                          : t('Next')}
                  {!submitting && currentStep !== totalSteps - 1 && (
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  )}
                  {!submitting && currentStep === totalSteps - 1 && (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
