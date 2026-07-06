'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { UNCATEGORIZED_LABEL } from '@/config/categories';
import { adminFetch, ensureArray, isAdminFetchError, parseJsonResponse } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import {
  PlusCircle,
  Users,
  Clock,
  LogOut,
  Edit3,
  Lock,
  Power,
  Trash2,
  BarChart3,
  Share2,
  Copy,
  Check,
  X,
  Send,
  Trophy,
  Menu,
} from 'lucide-react';

interface ReferralLeaderboardEntry {
  email: string;
  referral_count: number;
}

interface Survey {
  id: string;
  title: string;
  is_active: boolean;
  has_been_published?: boolean;
  description?: string;
  category?: string | null;
  response_count?: number;
  estimated_minutes?: number;
  team_id?: string | null;
}

interface ShareLink {
  id: string;
  code: string;
  label?: string | null;
  response_count?: number;
}

// One reusable style for every small icon-only row/menu action so the whole
// panel reads as a single monochrome system: ink (black in light, white in
// dark) on hover, nothing else, unless explicitly overridden per-button.
const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink dark:hover:bg-white/10';

export default function AdminDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState<{ id: string; title: string } | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareLabel, setShareLabel] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [hideZeroResponses, setHideZeroResponses] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createModal, setCreateModal] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [creatingSurvey, setCreatingSurvey] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Distinct categories actually in use, so new labels appear in the filter
  // automatically without touching this code. `__uncategorized__` is a sentinel
  // for surveys with no category set.
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
    if (categoryFilter === 'all') return surveys;
    if (categoryFilter === '__uncategorized__')
      return surveys.filter((s) => !s.category || !s.category.trim());
    return surveys.filter((s) => s.category?.trim() === categoryFilter);
  }, [surveys, categoryFilter]);

  const fetchSurveys = () => {
    adminFetch('/api/surveys?include_inactive=true')
      .then((res) => parseJsonResponse<unknown>(res, 'Failed to fetch surveys'))
      .then((data) => ensureArray<Survey>(data, 'Unexpected survey response from API'))
      .then((data) => {
        setSurveys(data);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        if (!isAdminFetchError(err)) {
          console.error('Failed to fetch surveys', err);
        }
        setSurveys([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch surveys');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const handleCreateSurvey = async () => {
    if (!newSurveyTitle.trim()) return;
    setCreatingSurvey(true);
    try {
      const res = await adminFetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSurveyTitle.trim(),
          is_active: false,
          questions: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/admin/edit/${data.id}`);
      } else {
        alert('Failed to create survey.');
        setCreatingSurvey(false);
      }
    } catch {
      alert('An error occurred.');
      setCreatingSurvey(false);
    }
  };

  const handleToggleActive = async (survey: Survey) => {
    if (!survey.is_active) {
      const confirmed = window.confirm(
        'WARNING: Activating this survey will make it visible to users and PERMANENTLY LOCK it from future edits. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    try {
      const res = await adminFetch(`/api/surveys/${survey.id}/toggle`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchSurveys(); // Refresh to get updated statuses for all surveys
      } else {
        alert('Failed to toggle survey status.');
      }
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('An error occurred while toggling.');
    }
  };

  const handleDelete = async (survey: Survey) => {
    const confirmMessage = survey.is_active
      ? `CRITICAL WARNING: "${survey.title}" is currently ACTIVE! Deleting it will instantly remove it from the live site and PERMANENTLY DESTROY all respondent data collected so far. Type "DELETE" to confirm.`
      : `WARNING: Are you sure you want to permanently delete "${survey.title}"? This will also destroy all respondent data collected for this survey. This cannot be undone.`;

    if (survey.is_active) {
      const input = window.prompt(confirmMessage);
      if (input !== 'DELETE') {
        alert('Deletion cancelled.');
        return;
      }
    } else {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    }

    try {
      const res = await adminFetch(`/api/surveys/${survey.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSurveys();
      } else {
        alert('Failed to delete survey.');
      }
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('An error occurred while deleting.');
    }
  };

  const handleDuplicate = async (survey: Survey) => {
    try {
      const res = await adminFetch(`/api/surveys/${survey.id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchSurveys();
      } else {
        alert('Failed to duplicate survey.');
      }
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('An error occurred while duplicating.');
    }
  };

  const handleNotifyUsers = async () => {
    const confirm = window.confirm(
      `Send a reminder email blast to all users who still have active surveys remaining?`
    );
    if (!confirm) return;

    try {
      const res = await adminFetch('/api/admin/notify-new-survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Success! ${data.message || 'Notification sent.'}`);
      } else {
        const data = await res.json();
        alert(`Failed to notify users: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('An error occurred while trying to send notifications.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const openShareModal = async (survey: Survey | null) => {
    if (survey) {
      setShareModal({ id: survey.id, title: survey.title });
    } else {
      setShareModal({ id: 'global', title: 'Global Landing Page' });
    }
    setShareLinks([]);
    setShareLabel('');
    // Fetch existing share links
    try {
      const url = survey ? `/api/surveys/${survey.id}/share-links` : `/api/global-share-links`;
      const res = await adminFetch(url);
      const data = await parseJsonResponse<unknown>(res, 'Failed to load share links');
      setShareLinks(ensureArray<ShareLink>(data, 'Unexpected share link response from API'));
    } catch {
      /* ignore */
    }
  };

  const openLeaderboard = async () => {
    setLeaderboardModal(true);
    setLoadingLeaderboard(true);
    try {
      const res = await adminFetch('/api/admin/referrals/leaderboard');
      const data = await parseJsonResponse<unknown>(res, 'Failed to load leaderboard');
      setLeaderboard(
        ensureArray<ReferralLeaderboardEntry>(data, 'Unexpected leaderboard response from API')
      );
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!shareModal) return;
    setGeneratingLink(true);
    try {
      const isGlobal = shareModal.id === 'global';
      const apiUrl = isGlobal
        ? `/api/global-share-links`
        : `/api/surveys/${shareModal.id}/share-links`;

      const res = await adminFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: shareLabel.trim() || null }),
      });
      const newLink = await parseJsonResponse<ShareLink>(res, 'Failed to generate link');
      newLink.response_count = 0;
      setShareLinks((prev) => [newLink, ...prev]);
      setShareLabel('');
      // Auto-copy the new link
      const url = isGlobal
        ? `${baseUrl}?ref=${newLink.code}`
        : `${baseUrl}/survey/${shareModal.id}?ref=${newLink.code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(newLink.code);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      alert('Failed to generate link.');
    }
    setGeneratingLink(false);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await adminFetch(`/api/share-links/${linkId}`, { method: 'DELETE' });
      setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      alert('Failed to delete link.');
    }
  };

  const copyToClipboard = async (text: string, code: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const totalActiveResponses = surveys
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (s.response_count || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0"
      >
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink flex flex-wrap items-center gap-3">
            Dashboard Overview
            <span className="text-sm font-medium bg-card border border-border text-ink-soft px-3 py-1 rounded-full">
              {totalActiveResponses} active responses
            </span>
          </h1>
          <p className="text-ink-soft mt-1">Manage your surveys and view engagement metrics.</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreateModal(true)}
            className="flex items-center px-4 py-2.5 rounded-lg font-semibold bg-ink text-cream hover:opacity-90 transition-opacity"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Survey
          </motion.button>

          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Admin actions"
              aria-expanded={menuOpen}
              className="flex h-10.5 w-10.5 items-center justify-center rounded-lg border border-border text-ink hover:bg-cream-deep dark:hover:bg-white/10 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </motion.button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-xl border border-border bg-card shadow-cute py-1.5 z-50 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleNotifyUsers();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream-deep dark:hover:bg-white/10 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Remind Users
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openLeaderboard();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream-deep dark:hover:bg-white/10 transition-colors"
                    >
                      <Trophy className="w-4 h-4" />
                      Leaderboard
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openShareModal(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream-deep dark:hover:bg-white/10 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      Global Links
                    </button>
                    <div className="my-1.5 border-t border-border" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {availableCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center gap-2 mb-6"
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft mr-1">
            Category
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              categoryFilter === 'all'
                ? 'bg-ink text-cream border-ink'
                : 'bg-card text-ink-soft border-border hover:border-ink'
            }`}
          >
            All
          </button>
          {availableCategories.map((cat) => {
            const isUncat = cat === '__uncategorized__';
            const label = isUncat ? UNCATEGORIZED_LABEL : cat;
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-card text-ink-soft border-border hover:border-ink'
                } ${isUncat ? 'italic' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </motion.div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-card rounded-2xl shadow-cute-sm border border-border overflow-x-auto overflow-y-hidden"
      >
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-cream-deep/50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider"
              >
                Survey Title
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider"
              >
                Responses
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-ink-soft uppercase tracking-wider"
              >
                Est. Time
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-semibold text-ink-soft uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSurveys.map((survey, idx) => (
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
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${survey.is_active ? 'bg-emerald-500' : 'bg-ink-soft'}`}
                    />
                    {survey.is_active ? 'Active' : 'Inactive'}
                  </span>
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
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/results/${survey.id}`}
                      title="Results"
                      className={iconButton}
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => openShareModal(survey)}
                      title="Share Links"
                      className={iconButton}
                    >
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
                </td>
              </motion.tr>
            ))}
            {filteredSurveys.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-ink-soft">
                  {surveys.length === 0
                    ? 'No surveys found. Create one to get started!'
                    : 'No surveys in this category.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Share Link Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setShareModal(null)}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-1 flex items-center">
                <Share2 className="w-5 h-5 mr-2" />
                Share Links
              </h2>
              <div className="flex justify-between items-center mb-5">
                <p className="text-sm text-ink-soft">
                  Generate unique tracked links for <strong>{shareModal.title}</strong>
                </p>
                <label className="flex items-center text-sm text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideZeroResponses}
                    onChange={(e) => setHideZeroResponses(e.target.checked)}
                    className="mr-2 rounded border-border text-ink focus:ring-ink"
                  />
                  Hide 0 responses
                </label>
              </div>

              {/* Generate new link */}
              <div className="flex space-x-2 mb-5">
                <input
                  type="text"
                  value={shareLabel}
                  onChange={(e) => setShareLabel(e.target.value)}
                  placeholder="Label (intern name)"
                  className="flex-grow p-2.5 border-2 border-border rounded-lg bg-card text-ink focus:border-ink focus:outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerateLink();
                  }}
                />
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleGenerateLink}
                  disabled={generatingLink}
                  className="px-4 py-2 bg-ink text-cream rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
                >
                  {generatingLink ? '...' : '+ Generate'}
                </motion.button>
              </div>

              {/* List of generated links */}
              <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                {shareLinks.length === 0 && (
                  <p className="text-center text-ink-soft text-sm py-8">
                    No links generated yet. Click &quot;Generate&quot; to create one.
                  </p>
                )}
                {shareLinks
                  .filter(
                    (link) => !hideZeroResponses || (link.response_count && link.response_count > 0)
                  )
                  .map((link) => {
                    const isGlobal = shareModal.id === 'global';
                    const url = isGlobal
                      ? `${baseUrl}?ref=${link.code}`
                      : `${baseUrl}/survey/${shareModal.id}?ref=${link.code}`;
                    const isCopied = copiedLink === link.code;
                    return (
                      <div
                        key={link.id}
                        className="bg-cream-deep/50 border border-border rounded-lg p-3 group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-ink">
                              {link.label || (
                                <span className="text-ink-soft italic">Unlabeled</span>
                              )}
                            </span>
                            <span className="text-xs bg-card border border-border px-1.5 py-0.5 rounded font-mono text-ink-soft">
                              {link.code}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-ink-soft font-medium">
                              {link.response_count} response{link.response_count !== 1 ? 's' : ''}
                            </span>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="text-ink-soft/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <code className="text-xs text-ink-soft truncate mr-2 flex-1">{url}</code>
                          <button
                            onClick={() => copyToClipboard(url, link.code)}
                            className={`flex items-center text-xs font-medium px-2 py-1 rounded transition-all ${isCopied ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-card border border-border text-ink-soft hover:text-ink hover:border-ink'}`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Survey Modal */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
            >
              <button
                onClick={() => {
                  setCreateModal(false);
                  setNewSurveyTitle('');
                }}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-4 flex items-center">
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New Survey
              </h2>
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-soft mb-2">Survey Title</label>
                <input
                  type="text"
                  autoFocus
                  value={newSurveyTitle}
                  onChange={(e) => setNewSurveyTitle(e.target.value)}
                  placeholder="e.g. Employee Feedback 2024"
                  className="w-full p-2.5 border border-border rounded-lg bg-card text-ink focus:ring-2 focus:ring-ink focus:border-transparent outline-none transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateSurvey();
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setCreateModal(false);
                    setNewSurveyTitle('');
                  }}
                  className="px-4 py-2 text-ink-soft hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCreateSurvey}
                  disabled={creatingSurvey || !newSurveyTitle.trim()}
                  className="px-4 py-2 bg-ink text-cream rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {creatingSurvey ? 'Creating...' : 'Create Survey'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Referral Leaderboard Modal */}
      <AnimatePresence>
        {leaderboardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setLeaderboardModal(false)}
                className="absolute top-4 right-4 text-ink-soft hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink mb-5 flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Referrals Leaderboard
              </h2>

              <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                {loadingLeaderboard ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-center text-ink-soft text-sm py-8">
                    No referrals recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <div
                        key={entry.email}
                        className="flex items-center justify-between bg-cream-deep/50 border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-bold w-6 text-center text-ink-soft">
                            #{idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-ink truncate max-w-[200px]">
                            {entry.email}
                          </span>
                        </div>
                        <span className="text-sm font-medium border border-border px-2 py-1 rounded-full text-ink-soft">
                          {entry.referral_count}{' '}
                          {entry.referral_count === 1 ? 'referral' : 'referrals'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
