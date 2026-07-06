'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Reveal from '@/components/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';

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
  thumbnail_url?: string | null;
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

  return (
    <div className="flex-1 w-full flex flex-col items-center pb-24">
      <div className="w-full max-w-6xl mx-auto px-5 pt-10 md:pt-16">
        <SectionHeading
          title={t('Active Surveys')}
          eyebrow={t('Share your voice and help empower Canadian youth.')}
          className="mb-16 text-center items-center"
        />

        {availableCategories.length > 0 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mb-12">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-navy text-white border-navy'
                  : 'bg-card text-ink-soft border-border hover:border-navy'
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
                    ? 'bg-navy text-white border-navy'
                    : 'bg-card text-ink-soft border-border hover:border-navy'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              const descriptionText =
                displayDescription?.replace(/<[^>]*>?/gm, '') ||
                t('Share your perspective on issues that matter.');

              return (
                <Reveal key={item.id} delay={idx * 0.1}>
                  {/* Dark mode: full-bleed cinematic photo, dark vignette,
                      white text — unchanged from the original.
                      Light mode: the photo stays clean and true-color with
                      nothing over it; the title/description/CTA live on a
                      solid card panel below instead of a wash on the photo,
                      since no translucent tint reads as "premium" once you
                      need black text to survive over an arbitrary photo. */}
                  <article className="group relative flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-cute-sm transition-transform duration-500 hover:-translate-y-2 dark:border-white/10 dark:bg-[#101014] dark:shadow-[0_28px_70px_-34px_rgba(0,0,0,0.75)]">
                    <div
                      className="relative h-48 w-full shrink-0 overflow-hidden bg-cover bg-center transition-transform duration-700 group-hover:scale-105 dark:absolute dark:inset-0 dark:h-full"
                      style={{
                        backgroundImage: item.thumbnail_url
                          ? `url(${item.thumbnail_url})`
                          : 'linear-gradient(135deg, #101014 0%, #04377e 48%, #0cb7c4 100%)',
                      }}
                    />
                    <div className="hidden dark:block dark:absolute dark:inset-0 dark:bg-black/45" />
                    <div className="hidden dark:block dark:absolute dark:inset-0 dark:bg-linear-to-t dark:from-black/90 dark:via-black/45 dark:to-black/20" />
                    <div className="hidden dark:block dark:absolute dark:inset-0 dark:bg-radial dark:from-transparent dark:via-black/5 dark:to-black/45" />
                    <div className="hidden dark:block dark:pointer-events-none dark:absolute dark:inset-x-0 dark:top-0 dark:h-24 dark:bg-linear-to-b dark:from-white/10 dark:to-transparent dark:opacity-70" />

                    {/* Category / duration chips float over the photo in both
                        themes — they carry their own frosted backing, so they
                        read fine on any photo without a wash underneath. */}
                    <div className="absolute inset-x-0 top-0 z-10 flex min-h-8 items-center justify-between gap-3 p-5 sm:p-6">
                      {item.category && (
                        <span className="max-w-[70%] truncate rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-ink-soft shadow-sm backdrop-blur-md dark:border dark:border-white/20 dark:bg-white/12 dark:text-white/85 dark:shadow-none">
                          {item.category}
                        </span>
                      )}
                      <span className="ml-auto inline-flex items-center whitespace-nowrap rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-ink-soft shadow-sm backdrop-blur-md dark:bg-black/25 dark:text-white/75 dark:shadow-none">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        {item.estimated_minutes} {t('MIN')}
                      </span>
                    </div>

                    <div className="relative z-10 flex w-full flex-1 flex-col justify-between bg-card p-5 text-ink sm:p-6 dark:absolute dark:inset-0 dark:bg-transparent dark:pt-16 dark:text-white">
                      <div>
                        <h2 className="line-clamp-2 font-display text-2xl font-medium leading-tight tracking-tight text-ink dark:text-white">
                          {displayTitle}
                        </h2>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-soft dark:text-white/72">
                          {descriptionText}
                        </p>
                      </div>

                      <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-4 dark:rounded-2xl dark:border dark:border-t dark:border-white/12 dark:bg-white/10 dark:p-3 dark:pt-3 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] dark:backdrop-blur-md">
                        {isCompleted ? (
                          <span className="inline-flex items-center rounded-full bg-teal-soft px-3 py-2 text-sm font-bold text-teal-deep">
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            {t('Completed')}
                          </span>
                        ) : (
                          <Link
                            href={`/survey/${item.id}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-4 py-2.5 text-sm font-bold text-white shadow-cute-sm transition-all duration-200 hover:bg-teal-deep active:scale-[0.98] sm:w-auto dark:bg-white dark:text-black dark:hover:bg-white/90"
                          >
                            {t('Start Survey')}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
