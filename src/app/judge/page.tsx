'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle, LogOut, ChevronRight, Activity } from 'lucide-react';
import Link from 'next/link';

type Survey = {
  id: string;
  title: string;
  description: string;
  is_scored: boolean;
};

export default function JudgeDashboard() {
  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchSurveys = async (judgeId: string) => {
    try {
      const res = await fetch(`/api/judging/surveys?judge_id=${judgeId}`);
      if (res.ok) {
        const data = await res.json();
        setSurveys(data);
      }
    } catch (e) {
      console.error(e);
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
    fetchSurveys(parsed.id);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('judgeProfile');
    router.push('/judge/login');
  };

  if (!profile || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const completed = surveys.filter((s) => s.is_scored).length;
  const total = surveys.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Decorative header blur */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 py-12 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              Welcome, {profile.name}
            </h1>
            <p className="text-slate-400 mt-2">
              You have {total - completed} surveys left to evaluate.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start md:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 mb-12 shadow-2xl"
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-1">
                Overall Progress
              </p>
              <p className="text-2xl font-semibold text-white">
                {completed} / {total}{' '}
                <span className="text-slate-500 text-lg font-normal">Scored</span>
              </p>
            </div>
            <span className="text-indigo-400 font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
            />
          </div>
        </motion.div>

        {/* Survey List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            Assigned Surveys
          </h2>

          <div className="grid gap-4">
            {surveys.map((survey, i) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/judge/score/${survey.id}`}>
                  <div className="group relative block bg-slate-900/40 backdrop-blur-sm border border-slate-800 rounded-xl p-5 hover:bg-slate-800/60 transition-all hover:border-indigo-500/30 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/0 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-lg ${survey.is_scored ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors'}`}
                        >
                          {survey.is_scored ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <ClipboardList className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-slate-100 group-hover:text-white transition-colors">
                            {survey.title}
                          </h3>
                          <p className="text-sm text-slate-400 line-clamp-1 mt-1">
                            {survey.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {survey.is_scored && (
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Evaluated
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}

            {surveys.length === 0 && (
              <div className="text-center py-12 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl">
                <p className="text-slate-400">No active surveys available to score.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
