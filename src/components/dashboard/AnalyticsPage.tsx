'use client';
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { UNCATEGORIZED_LABEL } from '@/config/categories';
import { useDashboard } from '@/contexts/DashboardContext';

export function AnalyticsPage() {
  const { surveys, loading } = useDashboard();

  const stats = useMemo(() => {
    const totalResponses = surveys.reduce((sum, s) => sum + (s.response_count || 0), 0);
    const published = surveys.filter((s) => s.has_been_published).length;
    const avgMinutes = surveys.length
      ? Math.round(surveys.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0) / surveys.length)
      : 0;
    const categories = new Set(
      surveys.map((s) => (s.category?.trim() ? s.category.trim() : UNCATEGORIZED_LABEL))
    );
    return { totalResponses, published, avgMinutes, categoryCount: categories.size };
  }, [surveys]);

  const bySurvey = useMemo(
    () => [...surveys].sort((a, b) => (b.response_count || 0) - (a.response_count || 0)),
    [surveys]
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of surveys) {
      const key = s.category?.trim() ? s.category.trim() : UNCATEGORIZED_LABEL;
      map.set(key, (map.get(key) || 0) + (s.response_count || 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [surveys]);

  const maxSurvey = Math.max(1, ...bySurvey.map((s) => s.response_count || 0));
  const maxCategory = Math.max(1, ...byCategory.map(([, count]) => count));

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
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Aggregate performance across every survey in your workspace.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4"
      >
        {[
          { label: 'Total Responses', value: stats.totalResponses },
          { label: 'Published Surveys', value: stats.published },
          { label: 'Categories', value: stats.categoryCount },
          { label: 'Avg. Est. Time', value: `${stats.avgMinutes}m` },
        ].map((stat) => (
          <div key={stat.label} className="bg-card px-6 py-5">
            <p className="text-xs uppercase tracking-wider text-ink-soft">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="mb-5 font-display text-lg font-medium tracking-tight text-ink">
            Responses by Category
          </h2>
          {byCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">No data yet.</p>
          ) : (
            <div className="space-y-4">
              {byCategory.map(([category, count], idx) => (
                <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink">{category}</span>
                    <span className="shrink-0 text-ink-soft">{count.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / maxCategory) * 100}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </div>
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
            Responses by Survey
          </h2>
          {bySurvey.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">No surveys yet.</p>
          ) : (
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {bySurvey.map((survey, idx) => (
                <div key={survey.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink">{survey.title}</span>
                    <span className="shrink-0 text-ink-soft">
                      {(survey.response_count || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${((survey.response_count || 0) / maxSurvey) * 100}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
