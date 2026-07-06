'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Users,
  Clock,
  Edit3,
  Lock,
  Power,
  Trash2,
  BarChart3,
  Share2,
  Copy,
  List,
  LayoutGrid,
  ArrowUpDown,
} from 'lucide-react';
import { UNCATEGORIZED_LABEL } from '@/config/categories';
import { useAdminDashboard, type Survey } from '@/contexts/AdminDashboardContext';

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'title' | 'responses' | 'status';
type ViewMode = 'list' | 'grid';

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink dark:hover:bg-white/10';

export default function AdminSurveysPage() {
  const {
    surveys,
    loading,
    error,
    searchQuery,
    openShareModal,
    handleToggleActive,
    handleDelete,
    handleDuplicate,
  } = useAdminDashboard();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    let hasUncategorized = false;
    for (const s of surveys) {
      if (s.category && s.category.trim()) set.add(s.category.trim());
      else hasUncategorized = true;
    }
    const sorted = [...set].sort((a, b) => a.localeCompare(b));
    return hasUncategorized ? [...sorted, '__uncategorized__'] : sorted;
  }, [surveys]);

  const filteredSurveys = useMemo(() => {
    let list = surveys;

    if (statusFilter === 'active') list = list.filter((s) => s.is_active);
    else if (statusFilter === 'inactive') list = list.filter((s) => !s.is_active);

    if (categoryFilter === '__uncategorized__') {
      list = list.filter((s) => !s.category || !s.category.trim());
    } else if (categoryFilter !== 'all') {
      list = list.filter((s) => s.category?.trim() === categoryFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortKey === 'responses') return (b.response_count || 0) - (a.response_count || 0);
      if (sortKey === 'status') return Number(b.is_active) - Number(a.is_active);
      return a.title.localeCompare(b.title);
    });
  }, [surveys, statusFilter, categoryFilter, searchQuery, sortKey]);

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
        className="mb-6"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Surveys</h1>
        <p className="mt-1 font-mono text-sm text-ink-soft">
          {surveys.length} total · {surveys.filter((s) => s.is_active).length} active
        </p>
      </motion.div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  statusFilter === key ? 'bg-ink text-cream' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {availableCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'border-ink bg-ink text-cream'
                    : 'border-border bg-card text-ink-soft hover:border-ink'
                }`}
              >
                All categories
              </button>
              {availableCategories.map((cat) => {
                const isUncat = cat === '__uncategorized__';
                const label = isUncat ? UNCATEGORIZED_LABEL : cat;
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                      active
                        ? 'border-ink bg-ink text-cream'
                        : 'border-border bg-card text-ink-soft hover:border-ink'
                    } ${isUncat ? 'italic' : ''}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-8 pr-3 text-sm font-medium text-ink-soft focus:outline-none focus:border-ink transition-colors"
            >
              <option value="title">Title</option>
              <option value="responses">Most responses</option>
              <option value="status">Status</option>
            </select>
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft" />
          </div>
          <div className="flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'list' ? 'bg-cream-deep text-ink dark:bg-white/10' : 'text-ink-soft hover:text-ink'}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`rounded-md p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-cream-deep text-ink dark:bg-white/10' : 'text-ink-soft hover:text-ink'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-ink-soft">
        {filteredSurveys.length} survey{filteredSurveys.length !== 1 ? 's' : ''}
      </p>

      {filteredSurveys.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center text-sm text-ink-soft">
          {surveys.length === 0
            ? 'No surveys found. Create one to get started!'
            : 'No surveys match these filters.'}
        </div>
      ) : viewMode === 'list' ? (
        <SurveyTable
          surveys={filteredSurveys}
          openShareModal={openShareModal}
          handleToggleActive={handleToggleActive}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
        />
      ) : (
        <SurveyGrid
          surveys={filteredSurveys}
          openShareModal={openShareModal}
          handleToggleActive={handleToggleActive}
          handleDelete={handleDelete}
          handleDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
}

interface SurveyListProps {
  surveys: Survey[];
  openShareModal: (survey: Survey | null) => void;
  handleToggleActive: (survey: Survey) => void;
  handleDelete: (survey: Survey) => void;
  handleDuplicate: (survey: Survey) => void;
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink">
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-ink-soft'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function RowActions({
  survey,
  openShareModal,
  handleToggleActive,
  handleDelete,
  handleDuplicate,
}: {
  survey: Survey;
  openShareModal: (survey: Survey | null) => void;
  handleToggleActive: (survey: Survey) => void;
  handleDelete: (survey: Survey) => void;
  handleDuplicate: (survey: Survey) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/results/${survey.id}`} title="Results" className={iconButton}>
        <BarChart3 className="w-4 h-4" />
      </Link>
      <button onClick={() => openShareModal(survey)} title="Share Links" className={iconButton}>
        <Share2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleToggleActive(survey)}
        title={survey.is_active ? 'Deactivate' : 'Activate'}
        className={iconButton}
      >
        <Power className="w-4 h-4" />
      </button>
      {!survey.has_been_published ? (
        <Link href={`/admin/edit/${survey.id}`} title="Edit" className={iconButton}>
          <Edit3 className="w-4 h-4" />
        </Link>
      ) : (
        <Link
          href={`/admin/edit/${survey.id}`}
          title="View locked survey or edit translations"
          className={iconButton}
        >
          <Lock className="w-4 h-4" />
        </Link>
      )}
      <button
        onClick={() => handleDuplicate(survey)}
        title="Duplicate Survey"
        className={iconButton}
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleDelete(survey)}
        title="Delete Survey"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function SurveyTable({
  surveys,
  openShareModal,
  handleToggleActive,
  handleDelete,
  handleDuplicate,
}: SurveyListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card rounded-2xl shadow-cute-sm border border-border overflow-x-auto overflow-y-hidden"
    >
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-cream-deep/50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Survey Title
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Responses
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Est. Time
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {surveys.map((survey, idx) => (
            <motion.tr
              key={survey.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
              className="hover:bg-cream-deep/40 transition-colors"
            >
              <td className="px-6 py-4">
                <div className="text-sm font-semibold text-ink flex items-center gap-2">
                  {survey.title}
                  {survey.category?.trim() && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide border border-border text-ink-soft px-2 py-0.5 rounded-full">
                      {survey.category}
                    </span>
                  )}
                </div>
                <div className="text-sm text-ink-soft line-clamp-1">
                  {survey.description?.replace(/<[^>]*>?/gm, '')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge isActive={survey.is_active} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1.5" />
                  {survey.response_count || 0}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {survey.estimated_minutes} min
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end">
                  <RowActions
                    survey={survey}
                    openShareModal={openShareModal}
                    handleToggleActive={handleToggleActive}
                    handleDelete={handleDelete}
                    handleDuplicate={handleDuplicate}
                  />
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function SurveyGrid({
  surveys,
  openShareModal,
  handleToggleActive,
  handleDelete,
  handleDuplicate,
}: SurveyListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {surveys.map((survey, idx) => (
        <motion.div
          key={survey.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
          className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-cute-sm"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <StatusBadge isActive={survey.is_active} />
            {survey.category?.trim() && (
              <span className="text-[10px] font-semibold uppercase tracking-wide border border-border text-ink-soft px-2 py-0.5 rounded-full">
                {survey.category}
              </span>
            )}
          </div>
          <h3 className="mb-1 font-display text-base font-medium tracking-tight text-ink line-clamp-2">
            {survey.title}
          </h3>
          <p className="mb-4 line-clamp-2 flex-1 text-sm text-ink-soft">
            {survey.description?.replace(/<[^>]*>?/gm, '') || 'No description'}
          </p>
          <div className="mb-4 flex items-center gap-4 text-sm text-ink-soft">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1.5" />
              {survey.response_count || 0}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5" />
              {survey.estimated_minutes} min
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <RowActions
              survey={survey}
              openShareModal={openShareModal}
              handleToggleActive={handleToggleActive}
              handleDelete={handleDelete}
              handleDuplicate={handleDuplicate}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
