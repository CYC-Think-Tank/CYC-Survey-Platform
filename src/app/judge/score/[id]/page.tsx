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
        setTimeout(() => router.push('/judge'), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row overflow-hidden font-sans text-slate-200">
      {/* Left: Survey Preview iframe */}
      <div className="w-full md:w-1/2 h-[50vh] md:h-screen border-b md:border-b-0 md:border-r border-slate-800 relative bg-slate-900">
        <div className="absolute top-0 w-full bg-gradient-to-b from-slate-950/80 to-transparent p-4 flex items-center gap-4 z-10">
          <Link href="/judge" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-medium text-sm tracking-wide text-indigo-300 uppercase">
            Live Preview
          </span>
        </div>
        <iframe src={`/survey/${id}`} className="w-full h-full opacity-90" />
      </div>

      {/* Right: Scoring Form */}
      <div className="w-full md:w-1/2 h-full md:h-screen overflow-y-auto custom-scrollbar relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-fuchsia-900/10 to-transparent pointer-events-none" />

        <div className="p-8 max-w-2xl mx-auto pb-32">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Evaluation Form</h1>
            <p className="text-slate-400">
              Score this submission on a scale of 1 to 10 for each criterion.
            </p>
          </div>

          {/* Automated Scores Section */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Overall Reach (Automated)
            </h2>
            <div className="bg-cyan-950/20 border border-cyan-900/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3 text-sm text-cyan-300/70 mb-2">
                <Info className="w-4 h-4" />
                These scores are computed automatically based on the live data.
              </div>

              <div className="grid gap-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div>
                    <div className="text-white font-medium">Respondents</div>
                    <div className="text-xs text-slate-400">
                      {Number(autoScores?.total_responses || 0)} total
                    </div>
                  </div>
                  <div className="text-xl font-bold text-cyan-400">
                    {Number(autoScores?.respondents_score || 0)}
                    <span className="text-sm font-normal text-slate-500">/10</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div>
                    <div className="text-white font-medium">Languages Supported</div>
                    <div className="text-xs text-slate-400">
                      {Number(autoScores?.language_count || 0)} languages
                    </div>
                  </div>
                  <div className="text-xl font-bold text-cyan-400">
                    {Number(autoScores?.languages_score || 0)}
                    <span className="text-sm font-normal text-slate-500">/10</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-slate-800">
                  <div>
                    <div className="text-white font-medium">Geographic Coverage</div>
                    <div className="text-xs text-slate-400">
                      {Number(autoScores?.valid_provinces || 0)} provinces (2+ responses)
                    </div>
                  </div>
                  <div className="text-xl font-bold text-cyan-400">
                    {Number(autoScores?.geographic_score || 0)}
                    <span className="text-sm font-normal text-slate-500">/10</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Manual Scoring Sections */}
          {Object.entries(CRITERIA).map(([catKey, items]) => (
            <section key={catKey} className="mb-12">
              <h2 className="text-xl font-semibold text-fuchsia-400 capitalize mb-4 border-b border-slate-800 pb-2">
                {catKey}
              </h2>
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/40 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-slate-200 font-medium">{item.label}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
                      </div>
                      <div className="bg-slate-950 px-3 py-1 rounded-md border border-slate-800 text-fuchsia-400 font-bold">
                        {scores[catKey]?.[item.id] || 0}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={scores[catKey]?.[item.id] || 1}
                      onChange={(e) => updateScore(catKey, item.id, parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-2 font-medium">
                      <span>1 (Poor)</span>
                      <span>10 (Excellent)</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Feedback */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-indigo-400 mb-4 border-b border-slate-800 pb-2">
              General Feedback
            </h2>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide any additional rationale or qualitative feedback here..."
              className="w-full h-32 bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            />
          </section>
        </div>

        {/* Floating Action Bar */}
        <div className="fixed bottom-0 right-0 w-full md:w-1/2 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 p-4 px-8 flex justify-between items-center z-50">
          <div>
            <span className="text-slate-400 text-sm uppercase tracking-wider font-medium">
              Total Score
            </span>
            <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-400">
              {calculateTotal()} <span className="text-lg text-slate-600 font-normal">pts</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || success}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-medium hover:from-indigo-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-fuchsia-500/20 disabled:opacity-50"
          >
            {success ? (
              <>
                <CheckCircle className="w-5 h-5" /> Submitted!
              </>
            ) : submitting ? (
              <>
                <Activity className="w-5 h-5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Submit Score
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
