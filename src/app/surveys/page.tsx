'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface Survey {
  id: string;
  title: string;
  title_fr?: string;
  title_zh?: string;
  description?: string;
  description_fr?: string;
  description_zh?: string;
  estimated_minutes?: number;
  category?: string | null;
  translations?: Record<string, { title?: string; description?: string; questions?: unknown[] }>;
}

export default function SurveysPage() {
  const { language, t } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const s of surveys) {
      if (s.category && s.category.trim()) set.add(s.category.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [surveys]);

  const visibleSurveys = useMemo(() => {
    if (categoryFilter === 'all') return surveys;
    return surveys.filter((s) => s.category?.trim() === categoryFilter);
  }, [surveys, categoryFilter]);

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem('cyc_completed_surveys') || '[]');
    setCompletedIds(c);
    fetch('/api/surveys')
      .then((r) => r.json())
      .then(async (d) => {
        const withTranslations = await Promise.all(
          d.map(async (survey: Survey) => {
            try {
              const tr = await fetch(`/api/surveys/${survey.id}/translation`).then((res) =>
                res.json()
              );
              return {
                ...survey,
                title_fr: tr?.title_fr,
                description_fr: tr?.description_fr,
                title_zh: tr?.title_zh,
                description_zh: tr?.description_zh,
                translations: tr?.translations,
              };
            } catch {
              return survey;
            }
          })
        );
        setSurveys(withTranslations);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex-1 flex justify-center items-center bg-slate-50 min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5C518]" />
      </div>
    );

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 bg-slate-50">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-4xl font-extrabold text-[#04377E] mb-3">{t('Active Surveys')}</h1>
        <p className="text-lg text-slate-500 font-medium">
          {t('Share your voice and help empower Canadian youth.')}
        </p>
      </motion.div>

      {availableCategories.length > 0 && (
        <div className="flex flex-wrap justify-center items-center gap-2 mb-8">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${
              categoryFilter === 'all'
                ? 'bg-[#04377E] text-white border-[#04377E]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#04377E]'
            }`}
          >
            {t('All')}
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${
                categoryFilter === cat
                  ? 'bg-[#04377E] text-white border-[#04377E]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#04377E]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
        {visibleSurveys.map((item, idx) => {
          const isCompleted = completedIds.includes(item.id);
          const displayTitle =
            item.translations?.[language]?.title ||
            (language === 'fr' && item.title_fr) ||
            (language === 'zh' && item.title_zh) ||
            item.title;
          const displayDescription =
            item.translations?.[language]?.description ||
            (language === 'fr' && item.description_fr) ||
            (language === 'zh' && item.description_zh) ||
            item.description;
          return (
            <motion.div
              key={item.id}
              className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border-t-[6px] border-[#F5C518] p-6 md:p-8 flex flex-col hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + idx * 0.1, ease: 'easeOut' }}
            >
              <h2 className="text-xl font-extrabold text-[#04377E] mb-3 leading-snug">
                {displayTitle}
              </h2>
              <p className="text-sm text-slate-500 mb-8 flex-1 leading-relaxed">
                {displayDescription?.replace(/<[^>]*>?/gm, '') ||
                  t('Share your perspective on issues that matter.')}
              </p>

              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="flex items-center text-xs text-slate-400 font-semibold tracking-wide">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  {item.estimated_minutes} {t('MIN')}
                </span>

                {isCompleted ? (
                  <span className="text-sm text-green-600 font-bold flex items-center bg-green-50 px-3 py-1.5 rounded-md">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {t('Completed')}
                  </span>
                ) : (
                  <Link
                    href={`/survey/${item.id}`}
                    className="flex items-center px-4 py-2 rounded-lg text-sm font-bold bg-[#F5C518] text-[#1a1a1a] hover:bg-yellow-400 transition-colors"
                  >
                    {t('Start Survey')}
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
