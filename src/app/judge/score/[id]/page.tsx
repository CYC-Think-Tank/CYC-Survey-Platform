'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Activity, ArrowLeft, Save, Info, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const CRITERIA = {
  marketing: [
    {
      id: 'multiculturalism',
      label: 'Multiculturalism',
      desc: 'How well does the survey cater to diverse groups?',
    },
    {
      id: 'followers_reach',
      label: 'Reach in terms of followers',
      desc: 'Effectiveness of distribution and social reach.',
    },
    {
      id: 'engagement_mission',
      label: 'Content Engaging & Reflects Mission',
      desc: 'Is it compelling and aligned with core goals?',
    },
  ],
  recommendations: [
    {
      id: 'thesis_quality',
      label: 'Thesis Quality',
      desc: 'Strength and clarity of the core argument.',
    },
    {
      id: 'implementation_plan',
      label: 'Implementation Plan',
      desc: 'Practicality and detail of the proposed plan.',
    },
  ],
  research: [
    {
      id: 'research_quality',
      label: 'Research Quality',
      desc: 'Depth, accuracy, and thoroughness.',
    },
    {
      id: 'objectives_clarity',
      label: 'Objectives Clear (Clarity)',
      desc: 'Can the goals be easily understood?',
    },
    {
      id: 'question_quality',
      label: 'Question Quality',
      desc: 'Are questions unbiased and well-structured?',
    },
    {
      id: 'safeguards',
      label: 'Safeguards (Data Quality)',
      desc: 'Measures taken to ensure valid, clean data.',
    },
  ],
};

export default function ScorePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [scores, setScores] = useState<Record<string, Record<string, number>>>({
    marketing: {},
    recommendations: {},
    research: {},
  });
  const [feedback, setFeedback] = useState('');
  const [autoScores, setAutoScores] = useState<Record<string, unknown> | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/judging/surveys/${id}/auto-scores`);
      if (res.ok) {
        const data = await res.json();
        setAutoScores(data);
      }
    } catch (e) {
      console.error('Failed to fetch auto scores', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const data = localStorage.getItem('judgeProfile');
    if (!data) {
      router.push('/judge/login');
      return;
    }
    const parsed = JSON.parse(data);
    setProfile(parsed);
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const updateScore = (category: string, field: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const calculateTotal = () => {
    let total = 0;
    Object.values(scores).forEach((cat) => {
      Object.values(cat).forEach((v) => (total += v));
    });

    // Add auto scores
    if (autoScores) {
      total += Number(autoScores.respondents_score || 0);
      total += Number(autoScores.languages_score || 0);
      total += Number(autoScores.geographic_score || 0);
    }
    return total;
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);

    const payload = {
      survey_id: id,
      judge_id: profile.id,
      judge_name: profile.name,
      scores,
      automated_scores: autoScores,
      total_score: calculateTotal(),
      feedback,
    };

    try {
      const res = await fetch('/api/judging/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/judge'), 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Activity className="w-8 h-8 text-[var(--color-cyc-primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden font-sans text-gray-900">
      {/* Left: Survey Preview iframe */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-screen border-b md:border-b-0 md:border-r border-gray-200 relative bg-card">
        <div className="absolute top-0 w-full bg-card/90 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center gap-4 z-10">
          <Link
            href="/judge"
            className="text-gray-500 hover:text-ink transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-semibold text-sm tracking-wide text-ink uppercase">
            Live Preview
          </span>
        </div>
        <iframe src={`/survey/${id}`} className="w-full h-full pt-14" />
      </div>

      {/* Right: Scoring Form */}
      <div className="w-full md:w-1/2 h-full md:h-screen overflow-y-auto custom-scrollbar bg-gray-50 relative pb-32">
        <div className="p-8 max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink mb-2">
              Evaluation Form
            </h1>
            <p className="text-gray-600">
              Score this submission on a scale of 1 to 10 for each criterion.
            </p>
          </div>

          {/* Automated Scores Section */}
          <section className="mb-10">
            <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
              <Activity className="w-5 h-5 text-[var(--color-cyc-primary)]" />
              Overall Reach (Automated)
            </h2>
            <div className="bg-card border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3 text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Info className="w-5 h-5 text-[var(--color-cyc-primary)] shrink-0" />
                These scores are computed automatically based on the live data from the survey
                responses.
              </div>

              <div className="grid gap-4">
                <div className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-gray-900 font-bold">Respondents</div>
                    <div className="text-sm text-gray-500">
                      {Number(autoScores?.total_responses || 0)} total
                    </div>
                  </div>
                  <div className="font-display text-2xl font-semibold text-[var(--color-cyc-primary)]">
                    {Number(autoScores?.respondents_score || 0)}
                    <span className="text-base font-medium text-gray-400">/10</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-gray-900 font-bold">Languages Supported</div>
                    <div className="text-sm text-gray-500">
                      {Number(autoScores?.language_count || 0)} languages
                    </div>
                  </div>
                  <div className="font-display text-2xl font-semibold text-[var(--color-cyc-primary)]">
                    {Number(autoScores?.languages_score || 0)}
                    <span className="text-base font-medium text-gray-400">/10</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <div className="text-gray-900 font-bold">Geographic Coverage</div>
                    <div className="text-sm text-gray-500">
                      {Number(autoScores?.valid_provinces || 0)} provinces (2+ responses)
                    </div>
                  </div>
                  <div className="font-display text-2xl font-semibold text-[var(--color-cyc-primary)]">
                    {Number(autoScores?.geographic_score || 0)}
                    <span className="text-base font-medium text-gray-400">/10</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Manual Scoring Sections */}
          {Object.entries(CRITERIA).map(([catKey, items]) => (
            <section key={catKey} className="mb-10">
              <h2 className="font-display text-xl font-medium tracking-tight text-ink capitalize mb-4 border-b border-gray-200 pb-2">
                {catKey}
              </h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card rounded-xl p-5 border border-gray-200 shadow-sm hover:border-[var(--color-cyc-primary)] transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-display text-lg font-medium tracking-tight text-ink">
                          {item.label}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                      </div>
                      <div className="bg-gray-50 px-3 py-1 rounded-md border border-gray-200 font-display text-lg font-semibold text-ink">
                        {scores[catKey]?.[item.id] || 0}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={scores[catKey]?.[item.id] || 1}
                      onChange={(e) => updateScore(catKey, item.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-cyc-primary)] outline-none focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:ring-offset-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2 font-semibold">
                      <span>1 (Poor)</span>
                      <span>10 (Excellent)</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Feedback */}
          <section className="mb-8">
            <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-4 border-b border-gray-200 pb-2">
              General Feedback
            </h2>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide any additional rationale or qualitative feedback here..."
              className="w-full h-32 bg-card border border-gray-300 rounded-xl p-4 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:border-transparent transition-shadow shadow-sm resize-none"
            />
          </section>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 right-0 w-full md:w-1/2 bg-card/90 backdrop-blur-md border-t border-gray-200 p-4 px-8 flex justify-between items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div>
            <span className="text-gray-500 text-sm uppercase tracking-wider font-bold">
              Total Score
            </span>
            <div className="font-display text-3xl font-semibold text-ink">
              {calculateTotal()} <span className="text-lg text-gray-400 font-medium">pts</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || success}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-[var(--color-cyc-accent)] text-gray-900 font-bold hover:bg-yellow-400 transition-all shadow-sm disabled:opacity-50"
          >
            {success ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-700" /> Saved!
              </>
            ) : submitting ? (
              <>
                <Activity className="w-5 h-5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Submit Evaluation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
