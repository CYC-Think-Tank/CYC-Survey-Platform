'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { UNCATEGORIZED_LABEL } from '@/config/categories';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';

export default function AdminAudiencePage() {
  const { surveys, loading } = useAdminDashboard();

  const totalResponses = useMemo(
    () => surveys.reduce((sum, s) => sum + (s.response_count || 0), 0),
    [surveys]
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of surveys) {
      const key = s.category?.trim() ? s.category.trim() : UNCATEGORIZED_LABEL;
      map.set(key, (map.get(key) || 0) + (s.response_count || 0));
    }
    return [...map.entries()].filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  }, [surveys]);

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
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Audience</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Who&apos;s responding, grouped by the topics your surveys cover.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-8 rounded-2xl border border-border bg-card px-6 py-5"
      >
        <p className="text-xs uppercase tracking-wider text-ink-soft">Total Respondents</p>
        <p className="mt-2 text-3xl font-semibold text-ink">{totalResponses.toLocaleString()}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-5 font-display text-lg font-medium tracking-tight text-ink">
          Reach by Category
        </h2>
        {byCategory.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">No responses recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {byCategory.map(([category, count], idx) => {
              const share = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
              return (
                <div key={category}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-ink">{category}</span>
                    <span className="shrink-0 text-ink-soft">
                      {count.toLocaleString()} · {share}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream-deep">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${share}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-ink"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4"
      >
        <p className="text-sm text-ink-soft">
          Language and referral-source breakdowns are tracked per survey.
        </p>
        <Link
          href="/admin/surveys"
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink transition-colors hover:opacity-70"
        >
          Open a survey&apos;s results
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>
    </div>
  );
}
