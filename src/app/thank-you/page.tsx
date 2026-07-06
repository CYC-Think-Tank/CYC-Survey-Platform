'use client';
import { CheckCircle2, Clock, ArrowRight, Copy, Gift } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import Reveal from '@/components/Reveal';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface Survey {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  thumbnail_url?: string;
  title_fr?: string;
  description_fr?: string;
  title_zh?: string;
  description_zh?: string;
  translations?: Record<string, { title?: string; description?: string; questions?: unknown[] }>;
}

export default function ThankYouPage() {
  const { language, t } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem('cyc_global_email');
    if (email) {
      fetch(`/api/user/referral-link?email=${encodeURIComponent(email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.code) setReferralCode(data.code);
        })
        .catch((err) => console.error('Failed to get referral link', err));
    }
  }, []);

  useEffect(() => {
    fetch('/api/surveys?include_inactive=false')
      .then((res) => res.json())
      .then(async (data: Survey[]) => {
        const completedSurveys = JSON.parse(localStorage.getItem('cyc_completed_surveys') || '[]');
        const filteredData = data.filter((survey: Survey) => !completedSurveys.includes(survey.id));

        const withTranslations = await Promise.all(
          filteredData.map(async (survey: Survey) => {
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
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    if (!referralCode) return;
    const url = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center pb-24">
      <div className="w-full max-w-4xl mx-auto px-5 pt-10 md:pt-16 mb-20 text-center flex flex-col items-center">
        <Reveal>
          <div className="mx-auto flex justify-center items-center w-24 h-24 bg-teal-soft rounded-full mb-8">
            <CheckCircle2 className="w-12 h-12 text-teal" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-normal tracking-tighter text-ink mb-6">
            {t('Thank You!')}
          </h1>
          <p className="text-lg md:text-xl text-ink-soft leading-relaxed max-w-2xl mx-auto">
            {t(
              'Your responses have been successfully submitted. We greatly appreciate you taking the time to share your voice and help empower Canadian youth.'
            )}
          </p>
          <div className="mt-8 bg-gold-soft border border-gold/20 p-5 rounded-2xl max-w-2xl mx-auto shadow-sm">
            <p className="text-base text-gold-deep font-semibold leading-relaxed">
              {t(
                'Thanks for filling out the survey, we would really appreciate if you could share this survey with a friend in order to represent as many voices as possible.'
              )}
            </p>
          </div>
        </Reveal>
      </div>

      {/* Referral Link Section */}
      {referralCode && (
        <div className="w-full max-w-4xl mx-auto px-5 mb-20">
          <Reveal>
            <div className="bg-linear-to-r from-teal to-teal-deep p-8 md:p-10 rounded-2xl shadow-cute text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Gift className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <h2 className="font-display text-3xl md:text-5xl font-normal tracking-tighter mb-6 flex justify-center items-center drop-shadow-md">
                  <Gift className="w-10 h-10 mr-4" />
                  {t('Boost Your Chances to Win $100!')}
                </h2>

                <div className="bg-white/20 backdrop-blur-sm border border-white/30 p-6 rounded-2xl mb-8 max-w-2xl mx-auto shadow-inner">
                  <div className="font-display text-2xl md:text-3xl font-semibold text-white mb-2 tracking-tight drop-shadow-sm">
                    {t('1 Referral = +1 Extra Raffle Entry')}
                  </div>
                  <p className="text-base md:text-lg text-white/90 leading-relaxed font-medium mt-3">
                    {t(
                      'Share your personal link below. There is no limit to how many entries you can earn. The more friends who complete the survey, the higher your chances of winning the $100 prize!'
                    )}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <code className="bg-white/10 px-4 py-3 rounded-xl text-base sm:text-lg font-mono tracking-wide backdrop-blur-md border border-white/20 select-all">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${referralCode}`}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="flex items-center px-6 py-3 bg-white text-teal-deep font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all w-full sm:w-auto justify-center"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        {t('Copied!')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-2" />
                        {t('Copy Link')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto px-5">
        <SectionHeading
          eyebrow={t('Active Surveys')}
          title={t('Keep Your Voice Heard')}
          className="mb-4 text-center items-center"
        />
        <Reveal>
          <p className="text-ink-soft text-lg text-center mb-12">
            {t('If you have a few more minutes, consider contributing to another active survey.')}
          </p>
        </Reveal>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold"></div>
          </div>
        ) : surveys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {surveys.map((survey, i) => {
              const displayTitle =
                survey.translations?.[language]?.title ||
                (language === 'fr' && survey.title_fr) ||
                (language === 'zh' && survey.title_zh) ||
                survey.title;
              const displayDescription =
                survey.translations?.[language]?.description ||
                (language === 'fr' && survey.description_fr) ||
                (language === 'zh' && survey.description_zh) ||
                survey.description;

              return (
                <Reveal key={survey.id} delay={i * 0.1}>
                  <Link href={`/survey/${survey.id}`} className="block h-full group">
                    <Card className="flex flex-col h-full hover:-translate-y-2 transition-transform duration-500 relative grayscale-[80%] hover:grayscale-0 overflow-hidden p-0 border-border group-hover:border-teal/30 group-hover:shadow-cute">
                      {survey.thumbnail_url ? (
                        <div className="h-48 w-full overflow-hidden border-b border-border">
                          <img
                            src={survey.thumbnail_url}
                            alt={survey.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ) : (
                        <div className="h-48 w-full bg-navy-soft flex items-center justify-center relative overflow-hidden group-hover:bg-navy transition-colors duration-500 border-b border-border">
                          <span className="font-display text-6xl font-semibold text-white/30 drop-shadow-sm select-none tracking-tight">
                            CYC
                          </span>
                        </div>
                      )}

                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="font-display text-xl font-medium tracking-tight text-ink mb-3 group-hover:text-teal transition-colors line-clamp-2">
                          {displayTitle}
                        </h3>
                        <p className="text-ink-soft text-base mb-6 line-clamp-2 flex-grow leading-relaxed">
                          {displayDescription?.replace(/<[^>]*>?/gm, '') ||
                            t('Participate in this survey to share your perspectives.')}
                        </p>

                        <div className="flex items-center justify-between text-sm font-semibold text-ink-soft mt-auto pt-4 border-t border-border">
                          <span className="flex items-center text-teal bg-teal-soft px-3 py-1.5 rounded-lg">
                            <Clock className="w-4 h-4 mr-1.5" />
                            {survey.estimated_minutes} {t('MIN')}
                          </span>
                          <span className="flex items-center text-white bg-teal px-4 py-1.5 rounded-lg group-hover:bg-teal-deep transition-colors shadow-sm">
                            {t('Take Survey')} <ArrowRight className="w-4 h-4 ml-1.5" />
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <Reveal>
            <Card className="text-center py-16 w-full max-w-2xl mx-auto border-border">
              <p className="text-ink-soft font-medium text-lg">
                {t('There are no other active surveys at the moment. Please check back later!')}
              </p>
            </Card>
          </Reveal>
        )}
      </div>
    </div>
  );
}
