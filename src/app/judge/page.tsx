'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Activity className="w-8 h-8 text-[var(--color-cyc-primary)] animate-spin" />
      </div>
    );
  }

  const completed = surveys.filter((s) => s.is_scored).length;
  const total = surveys.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-[var(--color-cyc-primary)] selection:text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
              Judge Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {profile.name}. You have {total - completed} surveys left to evaluate.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm self-start md:self-auto font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </header>

        {/* Progress Card */}
        <div className="bg-card border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">
                Overall Progress
              </p>
              <p className="text-2xl font-bold text-ink">
                {completed} / {total}{' '}
                <span className="text-gray-400 text-lg font-normal">Scored</span>
              </p>
            </div>
            <span className="text-[var(--color-cyc-primary)] font-bold text-lg">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-[var(--color-cyc-primary)] rounded-full transition-all duration-1000 ease-out"
            />
          </div>
        </div>

        {/* Survey List */}
        <div className="bg-card border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[var(--color-cyc-primary)]" />
              Assigned Surveys
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {surveys.map((survey) => (
              <Link
                href={`/judge/score/${survey.id}`}
                key={survey.id}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${survey.is_scored ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-[var(--color-cyc-primary)]'}`}
                    >
                      {survey.is_scored ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <ClipboardList className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display text-base font-medium tracking-tight text-ink">
                        {survey.title}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
                        {survey.description
                          ? survey.description.replace(/<[^>]*>?/gm, '')
                          : 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {survey.is_scored && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Evaluated
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}

            {surveys.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No active surveys available to score.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
