"use client";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from '@/contexts/LanguageContext';

interface Survey {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  thumbnail_url?: string;
  title_fr?: string;
  description_fr?: string;
}

export default function ThankYouPage() {
  const { language, t } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/surveys?include_inactive=false')
      .then(res => res.json())
      .then(async (data: Survey[]) => {
        const withTranslations = await Promise.all(
          data.map(async (survey: Survey) => {
            try {
              const tr = await fetch(`/api/surveys/${survey.id}/translation`).then(res => res.json());
              return {
                ...survey,
                title_fr: tr?.title_fr,
                description_fr: tr?.description_fr
              };
            } catch {
              return survey;
            }
          })
        );
        setSurveys(withTranslations);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 dark:bg-slate-900/50 py-12 px-4">
      {/* Thank You Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-12 rounded-2xl shadow-xl border-t-4 border-t-[var(--color-cyc-accent)] text-center mb-12">
        <div className="mx-auto flex justify-center items-center w-24 h-24 bg-teal-50 rounded-full mb-6">
          <CheckCircle2 className="w-14 h-14 text-[var(--color-cyc-primary)]" />
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-6">
          {t('Thank You!')}
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          {t('Your responses have been successfully submitted. We greatly appreciate you taking the time to share your voice and help empower Canadian youth.')}
        </p>
        <p className="text-base md:text-lg text-[#0CA7A1] font-semibold leading-relaxed max-w-2xl mx-auto mt-4 bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl">
          {t('Thanks for filling out the survey, we would really appreciate if you could share this survey with a friend in order to represent as many voices as possible.')}
        </p>
      </motion.div>

      {/* Cross-Promotion Section */}
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-3">{t('Keep Your Voice Heard')}</h2>
          <p className="text-gray-600 dark:text-slate-400 text-lg">{t('If you have a few more minutes, consider contributing to another active survey.')}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
          </div>
        ) : surveys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {surveys.map((survey, i) => {
              const displayTitle = (language === 'fr' && survey.title_fr ? survey.title_fr : survey.title) || survey.title;
              const displayDescription = (language === 'fr' && survey.description_fr ? survey.description_fr : survey.description) || survey.description;
              return (
              <motion.div key={survey.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Link href={`/survey/${survey.id}`} className="block h-full group">
                  <div className="border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden h-full flex flex-col hover:border-[var(--color-cyc-primary)] hover:shadow-xl transition-all duration-300 bg-white dark:bg-slate-800">
                    {survey.thumbnail_url ? (
                      <div className="h-48 w-full overflow-hidden">
                        <img src={survey.thumbnail_url} alt={survey.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="h-48 w-full bg-gradient-to-br from-[#0CA7A1] to-[#0A8A85] flex items-center justify-center relative overflow-hidden">
                        <span className="text-6xl font-black text-white drop-shadow-lg select-none tracking-wider">CYC</span>
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-grow">
                      <h3 className="font-bold text-xl text-gray-900 mb-3 group-hover:text-[var(--color-cyc-primary)] transition-colors line-clamp-2">
                        {displayTitle}
                      </h3>
                      <p className="text-gray-500 dark:text-slate-500 text-base mb-6 line-clamp-2 flex-grow leading-relaxed">
                        {displayDescription?.replace(/<[^>]*>?/gm, '') || t('Participate in this survey to share your perspectives.')}
                      </p>
                      <div className="flex items-center justify-between text-sm font-semibold text-gray-500 dark:text-slate-500 mt-auto pt-5 border-t border-gray-100">
                        <span className="flex items-center text-[var(--color-cyc-primary)] bg-teal-50 px-3 py-1.5 rounded-lg">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {survey.estimated_minutes} {t('MIN')}
                        </span>
                        <span className="flex items-center text-white bg-[var(--color-cyc-primary)] px-4 py-1.5 rounded-lg group-hover:bg-[#0A8A85] transition-colors shadow-sm">
                          {t('Take Survey')} <ArrowRight className="w-4 h-4 ml-1.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
            <p className="text-gray-500 dark:text-slate-500 font-medium text-lg">{t('There are no other active surveys at the moment. Please check back later!')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
