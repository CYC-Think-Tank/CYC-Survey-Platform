'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  adminFetch,
  ensureArray,
  fetchAdminMe,
  isAdminFetchError,
  parseJsonResponse,
  type AdminTeam,
} from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';

export interface Survey {
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

export interface ShareLink {
  id: string;
  code: string;
  label?: string | null;
  response_count?: number;
}

export interface ReferralLeaderboardEntry {
  email: string;
  referral_count: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export type DashboardRole = 'admin' | 'student';

const TREND_DAYS = 30;

interface DashboardValue {
  role: DashboardRole;
  basePath: string;

  surveys: Survey[];
  loading: boolean;
  error: string;
  refetch: () => void;
  adminEmail: string | null;
  userId: string | null;
  trend: TrendPoint[];
  trendLoading: boolean;

  searchQuery: string;
  setSearchQuery: (q: string) => void;

  createModalOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  newSurveyTitle: string;
  setNewSurveyTitle: (t: string) => void;
  creatingSurvey: boolean;
  handleCreateSurvey: () => Promise<void>;

  handleToggleActive: (survey: Survey) => Promise<void>;
  handleDelete: (survey: Survey) => Promise<void>;
  handleDuplicate: (survey: Survey) => Promise<void>;
  canDeleteSurvey: (survey: Survey) => boolean;
  handleNotifyUsers: () => Promise<void>;
  handleLogout: () => Promise<void>;

  shareModal: { id: string; title: string } | null;
  shareLinks: ShareLink[];
  shareLabel: string;
  setShareLabel: (l: string) => void;
  generatingLink: boolean;
  copiedLink: string | null;
  hideZeroResponses: boolean;
  setHideZeroResponses: (v: boolean) => void;
  openShareModal: (survey: Survey | null) => Promise<void>;
  closeShareModal: () => void;
  handleGenerateLink: () => Promise<void>;
  handleDeleteLink: (linkId: string) => Promise<void>;
  copyToClipboard: (text: string, code: string) => Promise<void>;
  baseUrl: string;

  leaderboardModal: boolean;
  leaderboard: ReferralLeaderboardEntry[];
  loadingLeaderboard: boolean;
  openLeaderboard: () => Promise<void>;
  closeLeaderboard: () => void;

  accountSettingsOpen: boolean;
  openAccountSettings: () => void;
  closeAccountSettings: () => void;

  // Lightweight team membership, used for delete-permission checks and the
  // student "Raffle Wheel" quick action. Full team management (invites,
  // join requests, leave/create) lives on the /student/teams hub and the
  // in-dashboard Team Settings page, not here.
  teams: AdminTeam[];
  isTeamLeader: boolean;
}

const DashboardContext = createContext<DashboardValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DashboardRole>(() =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/student')
      ? 'student'
      : 'admin'
  );
  const basePath = role === 'admin' ? '/admin' : '/student';

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [creatingSurvey, setCreatingSurvey] = useState(false);

  const [shareModal, setShareModal] = useState<{ id: string; title: string } | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareLabel, setShareLabel] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [hideZeroResponses, setHideZeroResponses] = useState(false);

  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);

  const [teams, setTeams] = useState<AdminTeam[]>([]);

  const router = useRouter();

  const fetchSurveys = useCallback(() => {
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
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  useEffect(() => {
    fetchAdminMe()
      .then((me) => {
        setAdminEmail(me.user.email);
        setUserId(me.user.id);
        setRole(me.is_admin ? 'admin' : 'student');
        setTeams(me.teams);
      })
      .catch(() => {
        setAdminEmail(null);
        setUserId(null);
      });
  }, []);

  // Response Trend: the survey list endpoint has no per-day breakdown, so we
  // pull each survey's individual response timestamps and bucket them by day
  // client-side. Only surveys that actually have responses are fetched, and
  // each fetch is capped, so this stays cheap for the common case.
  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    const loadTrend = async () => {
      setTrendLoading(true);
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (TREND_DAYS - 1));

      const buckets = new Map<string, number>();
      for (let i = 0; i < TREND_DAYS; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }

      const withResponses = surveys.filter((s) => (s.response_count || 0) > 0);
      await Promise.all(
        withResponses.map(async (s) => {
          try {
            const limit = Math.min(s.response_count || 0, 500);
            const res = await adminFetch(`/api/surveys/${s.id}/responses/paginated?limit=${limit}`);
            const data = await parseJsonResponse<{
              responses: { completed_at: string | null }[];
            }>(res, 'Failed to fetch responses');
            for (const r of data.responses) {
              if (!r.completed_at) continue;
              const day = r.completed_at.slice(0, 10);
              if (buckets.has(day)) {
                buckets.set(day, (buckets.get(day) || 0) + 1);
              }
            }
          } catch (err) {
            if (!isAdminFetchError(err)) console.error(err);
          }
        })
      );

      if (!cancelled) {
        setTrend([...buckets.entries()].map(([date, count]) => ({ date, count })));
        setTrendLoading(false);
      }
    };

    loadTrend();
    return () => {
      cancelled = true;
    };
  }, [surveys, loading]);

  const openCreateModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setNewSurveyTitle('');
  }, []);

  const handleCreateSurvey = useCallback(async () => {
    if (!newSurveyTitle.trim()) return;
    setCreatingSurvey(true);
    try {
      const res = await adminFetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSurveyTitle.trim(), is_active: false, questions: [] }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`${basePath}/edit/${data.id}`);
      } else {
        alert('Failed to create survey.');
        setCreatingSurvey(false);
      }
    } catch {
      alert('An error occurred.');
      setCreatingSurvey(false);
    }
  }, [newSurveyTitle, router, basePath]);

  const handleToggleActive = useCallback(
    async (survey: Survey) => {
      if (!survey.is_active) {
        const confirmed = window.confirm(
          'WARNING: Activating this survey will make it visible to users and PERMANENTLY LOCK it from future edits. Are you sure you want to proceed?'
        );
        if (!confirmed) return;
      }
      try {
        const res = await adminFetch(`/api/surveys/${survey.id}/toggle`, { method: 'PATCH' });
        if (res.ok) {
          fetchSurveys();
        } else {
          alert('Failed to toggle survey status.');
        }
      } catch (err) {
        if (!isAdminFetchError(err)) console.error(err);
        alert('An error occurred while toggling.');
      }
    },
    [fetchSurveys]
  );

  const handleDelete = useCallback(
    async (survey: Survey) => {
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
        const res = await adminFetch(`/api/surveys/${survey.id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchSurveys();
        } else {
          alert('Failed to delete survey.');
        }
      } catch (err) {
        if (!isAdminFetchError(err)) console.error(err);
        alert('An error occurred while deleting.');
      }
    },
    [fetchSurveys]
  );

  const handleDuplicate = useCallback(
    async (survey: Survey) => {
      try {
        const res = await adminFetch(`/api/surveys/${survey.id}/duplicate`, { method: 'POST' });
        if (res.ok) {
          fetchSurveys();
        } else {
          alert('Failed to duplicate survey.');
        }
      } catch (err) {
        if (!isAdminFetchError(err)) console.error(err);
        alert('An error occurred while duplicating.');
      }
    },
    [fetchSurveys]
  );

  const canDeleteSurvey = useCallback(
    (survey: Survey) => {
      if (role === 'admin') return true;
      return teams.some((team) => team.id === survey.team_id && team.role === 'team_leader');
    },
    [role, teams]
  );

  const handleNotifyUsers = useCallback(async () => {
    const confirmed = window.confirm(
      `Send a reminder email blast to all users who still have active surveys remaining?`
    );
    if (!confirmed) return;

    try {
      const res = await adminFetch('/api/admin/notify-new-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (!isAdminFetchError(err)) console.error(err);
      alert('An error occurred while trying to send notifications.');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push(`${basePath}/login`);
  }, [router, basePath]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const openShareModal = useCallback(async (survey: Survey | null) => {
    if (survey) {
      setShareModal({ id: survey.id, title: survey.title });
    } else {
      setShareModal({ id: 'global', title: 'Global Landing Page' });
    }
    setShareLinks([]);
    setShareLabel('');
    try {
      const url = survey ? `/api/surveys/${survey.id}/share-links` : `/api/global-share-links`;
      const res = await adminFetch(url);
      const data = await parseJsonResponse<unknown>(res, 'Failed to load share links');
      setShareLinks(ensureArray<ShareLink>(data, 'Unexpected share link response from API'));
    } catch {
      /* ignore */
    }
  }, []);

  const closeShareModal = useCallback(() => setShareModal(null), []);

  const openLeaderboard = useCallback(async () => {
    setLeaderboardModal(true);
    setLoadingLeaderboard(true);
    try {
      const res = await adminFetch('/api/admin/referrals/leaderboard');
      const data = await parseJsonResponse<unknown>(res, 'Failed to load leaderboard');
      setLeaderboard(
        ensureArray<ReferralLeaderboardEntry>(data, 'Unexpected leaderboard response from API')
      );
    } catch (err) {
      if (!isAdminFetchError(err)) console.error(err);
      alert('Failed to load leaderboard');
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const closeLeaderboard = useCallback(() => setLeaderboardModal(false), []);

  const openAccountSettings = useCallback(() => setAccountSettingsOpen(true), []);
  const closeAccountSettings = useCallback(() => setAccountSettingsOpen(false), []);

  const handleGenerateLink = useCallback(async () => {
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
  }, [shareModal, shareLabel, baseUrl]);

  const handleDeleteLink = useCallback(async (linkId: string) => {
    try {
      await adminFetch(`/api/share-links/${linkId}`, { method: 'DELETE' });
      setShareLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      alert('Failed to delete link.');
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string, code: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 2000);
  }, []);

  const isTeamLeader = teams.some((team) => team.role === 'team_leader');

  const value = useMemo<DashboardValue>(
    () => ({
      role,
      basePath,
      surveys,
      loading,
      error,
      refetch: fetchSurveys,
      adminEmail,
      userId,
      trend,
      trendLoading,
      searchQuery,
      setSearchQuery,
      createModalOpen,
      openCreateModal,
      closeCreateModal,
      newSurveyTitle,
      setNewSurveyTitle,
      creatingSurvey,
      handleCreateSurvey,
      handleToggleActive,
      handleDelete,
      handleDuplicate,
      canDeleteSurvey,
      handleNotifyUsers,
      handleLogout,
      shareModal,
      shareLinks,
      shareLabel,
      setShareLabel,
      generatingLink,
      copiedLink,
      hideZeroResponses,
      setHideZeroResponses,
      openShareModal,
      closeShareModal,
      handleGenerateLink,
      handleDeleteLink,
      copyToClipboard,
      baseUrl,
      leaderboardModal,
      leaderboard,
      loadingLeaderboard,
      openLeaderboard,
      closeLeaderboard,
      accountSettingsOpen,
      openAccountSettings,
      closeAccountSettings,
      teams,
      isTeamLeader,
    }),
    [
      role,
      basePath,
      surveys,
      loading,
      error,
      fetchSurveys,
      adminEmail,
      userId,
      trend,
      trendLoading,
      searchQuery,
      createModalOpen,
      openCreateModal,
      closeCreateModal,
      newSurveyTitle,
      creatingSurvey,
      handleCreateSurvey,
      handleToggleActive,
      handleDelete,
      handleDuplicate,
      canDeleteSurvey,
      handleNotifyUsers,
      handleLogout,
      shareModal,
      shareLinks,
      shareLabel,
      generatingLink,
      copiedLink,
      hideZeroResponses,
      openShareModal,
      closeShareModal,
      handleGenerateLink,
      handleDeleteLink,
      copyToClipboard,
      baseUrl,
      leaderboardModal,
      leaderboard,
      loadingLeaderboard,
      openLeaderboard,
      closeLeaderboard,
      accountSettingsOpen,
      openAccountSettings,
      closeAccountSettings,
      teams,
      isTeamLeader,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return ctx;
}
