'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Send, Trophy, Share2, ArrowRight } from 'lucide-react';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { ResponseTrendChart } from '@/components/admin/ResponseTrendChart';

const today = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export default function AdminOverview() {
  const {
    surveys,
    loading,
    trend,
    trendLoading,
    handleNotifyUsers,
    openLeaderboard,
    openShareModal,
  } = useAdminDashboard();

  const stats = useMemo(() => {
    const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);
    const activeSurveys = surveys.filter((s) => s.is_active).length;
    const totalSurveys = surveys.length;
    const avgResponses = totalSurveys > 0 ? Math.round(totalResponses / totalSurveys) : 0;
    return { totalResponses, activeSurveys, totalSurveys, avgResponses };
  }, [surveys]);

  const topSurveys = useMemo(
    () =>
      [...surveys].sort((a, b) => (b.response_count || 0) - (a.response_count || 0)).slice(0, 6),
    [surveys]
  );

  const maxResponses = Math.max(1, ...topSurveys.map((s) => s.response_count || 0));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
      </div>
    );
  }

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">{today}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4"
      >
        {[
          { label: 'Total Responses', value: stats.totalResponses },
          { label: 'Active Surveys', value: stats.activeSurveys },
          { label: 'Total Surveys', value: stats.totalSurveys },
          { label: 'Avg Responses / Survey', value: stats.avgResponses },
        ].map((stat) => (
          <div key={stat.label} className="bg-card px-6 py-5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Response Trend
          </h2>
          <span className="text-sm text-ink-soft">Last 30 days</span>
        </div>
        {trendLoading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
          </div>
        ) : trend.every((t) => t.count === 0) ? (
          <div className="flex h-56 items-center justify-center text-sm text-ink-soft">
            No responses in the last 30 days.
          </div>
        ) : (
          <ResponseTrendChart data={trend} />
        )}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6 lg:col-span-2"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Responses by Survey
            </h2>
            <Link
              href="/admin/surveys"
              className="flex items-center gap-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {topSurveys.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">
              No surveys yet. Create one to see responses here.
            </p>
          ) : (
            <div className="space-y-4">
              {topSurveys.map((survey, idx) => (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: idx * 0.03 }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink">{survey.title}</span>
                    <span className="shrink-0 text-ink-soft">
                      {(survey.response_count || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${((survey.response_count || 0) / maxResponses) * 100}%`,
                      }}
                      transition={{ duration: 0.6, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="mb-5 font-display text-lg font-medium tracking-tight text-ink">
            Quick Actions
          </h2>
          <div className="space-y-2">
            <button
              onClick={handleNotifyUsers}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream-deep dark:hover:bg-white/5"
            >
              <Send className="h-4 w-4" />
              Remind Users
            </button>
            <button
              onClick={openLeaderboard}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream-deep dark:hover:bg-white/5"
            >
              <Trophy className="h-4 w-4" />
              Referral Leaderboard
            </button>
            <button
              onClick={() => openShareModal(null)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream-deep dark:hover:bg-white/5"
            >
              <Share2 className="h-4 w-4" />
              Global Share Links
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
