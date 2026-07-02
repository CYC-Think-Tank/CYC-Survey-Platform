'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UNCATEGORIZED_LABEL } from '@/config/categories';
import {
  adminFetch,
  ensureArray,
  fetchAdminMe,
  isAdminFetchError,
  parseJsonResponse,
  type AdminTeam,
} from '@/lib/adminAuth';
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
  Crown,
  Trophy,
} from 'lucide-react';

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

interface TeamJoinRequest {
  id: string;
  team_id: string;
  team_name?: string | null;
  user_id: string;
  user_email?: string | null;
  requested_at?: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  team_name?: string | null;
  user_id: string;
  user_email?: string | null;
  full_name?: string | null;
  role: 'team_leader' | 'team_member';
}

export default function StudentDashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState<{ id: string; title: string } | null>(null);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareLabel, setShareLabel] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [hideZeroResponses, setHideZeroResponses] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createModal, setCreateModal] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [creatingSurvey, setCreatingSurvey] = useState(false);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [transferringMemberId, setTransferringMemberId] = useState<string | null>(null);
  const [leavingTeam, setLeavingTeam] = useState(false);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [updatingJoinRequestId, setUpdatingJoinRequestId] = useState<string | null>(null);
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

  const isTeamLeader = (adminTeams: AdminTeam[]) =>
    adminTeams.some((team) => team.role === 'team_leader');

  const fetchJoinRequests = () => {
    setLoadingJoinRequests(true);
    adminFetch('/admin-api/team-join-requests')
      .then((res) => parseJsonResponse<unknown>(res, 'Failed to load team requests'))
      .then((data) =>
        setJoinRequests(ensureArray<TeamJoinRequest>(data, 'Unexpected team-request response'))
      )
      .catch((err) => {
        if (!isAdminFetchError(err)) {
          console.error('Failed to load team requests', err);
        }
        setJoinRequests([]);
      })
      .finally(() => setLoadingJoinRequests(false));
  };

  const fetchTeamMembers = () => {
    setLoadingTeamMembers(true);
    adminFetch('/admin-api/team-members')
      .then((res) => parseJsonResponse<unknown>(res, 'Failed to load team members'))
      .then((data) =>
        setTeamMembers(ensureArray<TeamMember>(data, 'Unexpected team-member response'))
      )
      .catch((err) => {
        if (!isAdminFetchError(err)) {
          console.error('Failed to load team members', err);
        }
        setTeamMembers([]);
      })
      .finally(() => setLoadingTeamMembers(false));
  };

  useEffect(() => {
    fetchAdminMe()
      .then((me) => {
        setTeams(me.teams);
        if (me.teams.length === 0) {
          setSurveys([]);
          setLoading(false);
          return;
        }

        fetchSurveys();
        fetchTeamMembers();
        if (isTeamLeader(me.teams)) {
          fetchJoinRequests();
        }
      })
      .catch(() => {
        setTeams([]);
        setSurveys([]);
        setLoading(false);
      });
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
        router.push(`/student/edit/${data.id}`);
      } else {
        alert('Failed to create survey.');
        setCreatingSurvey(false);
      }
    } catch {
      alert('An error occurred.');
      setCreatingSurvey(false);
    }
  };

  const canDeleteSurvey = (survey: Survey) =>
    teams.some((team) => team.id === survey.team_id && team.role === 'team_leader');

  const currentUserIsTeamLeader = isTeamLeader(teams);

  const currentUserLeadsTeam = (teamId: string) =>
    teams.some((team) => team.id === teamId && team.role === 'team_leader');

  const teamMemberGroups = teams.map((team) => ({
    team,
    members: teamMembers.filter((member) => member.team_id === team.id),
  }));

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setUpdatingJoinRequestId(requestId);
    try {
      const res = await adminFetch(`/admin-api/team-join-requests/${requestId}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || data.error || `Failed to ${action} request.`);
        return;
      }
      fetchJoinRequests();
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert(`Failed to ${action} request.`);
    } finally {
      setUpdatingJoinRequestId(null);
    }
  };

  const transferLeadership = async (member: TeamMember) => {
    const memberLabel = member.full_name || member.user_email || 'this member';
    const confirmed = window.confirm(
      `Transfer leadership to ${memberLabel}? You will become a regular team member and only the new leader will be able to manage requests or delete surveys.`
    );
    if (!confirmed) return;

    setTransferringMemberId(member.id);
    try {
      const res = await adminFetch('/admin-api/team-members/transfer-leadership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: member.team_id,
          new_leader_user_id: member.user_id,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || data.error || 'Failed to transfer leadership.');
        return;
      }
      window.location.reload();
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('Failed to transfer leadership.');
    } finally {
      setTransferringMemberId(null);
    }
  };

  const leaveTeam = async () => {
    const confirmed = window.confirm(
      'Leave this team? You will lose access to its surveys and return to team onboarding.'
    );
    if (!confirmed) return;

    setLeavingTeam(true);
    try {
      const res = await adminFetch('/admin-api/team-members/leave', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.detail || data.error || 'Failed to leave team.');
        return;
      }
      window.location.href = '/student/pending-team';
    } catch (err) {
      if (!isAdminFetchError(err)) {
        console.error(err);
      }
      alert('Failed to leave team.');
    } finally {
      setLeavingTeam(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/student/login');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 flex items-center">
            Dashboard Overview
            <span className="ml-4 text-sm font-medium bg-[var(--color-cyc-primary)]/10 text-[var(--color-cyc-primary)] px-3 py-1 rounded-full border border-[var(--color-cyc-primary)]/20">
              {totalActiveResponses} total active responses
            </span>
          </h1>
          <p className="text-gray-500 dark:text-slate-500 mt-1">
            Manage your surveys and view engagement metrics.
          </p>
        </div>
        <div className="flex space-x-4 flex-wrap gap-y-2">
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Survey
          </button>

          {currentUserIsTeamLeader && (
            <Link
              href="/student/raffle"
              className="text-indigo-600 hover:text-indigo-800 flex items-center font-semibold"
            >
              <Trophy className="w-4 h-4 mr-1" />
              Raffle Wheel
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded flex items-center transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </button>
        </div>
      </div>
      {availableCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mr-1">
            Category
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
              categoryFilter === 'all'
                ? 'bg-[var(--color-cyc-primary)] text-white border-transparent'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[var(--color-cyc-primary)]'
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
                    ? 'bg-[var(--color-cyc-primary)] text-white border-transparent'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[var(--color-cyc-primary)]'
                } ${isUncat ? 'italic' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {teams.length > 0 && (
        <section className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                Team Members
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-500">
                View who has access to your team surveys.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!currentUserIsTeamLeader && (
                <button
                  type="button"
                  onClick={leaveTeam}
                  disabled={leavingTeam}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {leavingTeam ? 'Leaving...' : 'Leave team'}
                </button>
              )}
              <button
                type="button"
                onClick={fetchTeamMembers}
                disabled={loadingTeamMembers}
                className="text-sm font-semibold text-[var(--color-cyc-primary)] hover:text-teal-700 disabled:opacity-50"
              >
                {loadingTeamMembers ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {currentUserIsTeamLeader && (
              <div className="bg-yellow-50 px-6 py-3 text-sm text-yellow-800">
                Transfer leadership to another member before leaving this team.
              </div>
            )}
            {loadingTeamMembers ? (
              <div className="px-6 py-5 text-sm text-gray-500 dark:text-slate-500">
                Loading team members...
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="px-6 py-5 text-sm text-gray-500 dark:text-slate-500">
                No team members found.
              </div>
            ) : (
              teamMemberGroups.map(({ team, members }) => (
                <div key={team.id} className="px-6 py-4">
                  <div className="mb-3 text-sm font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                    {team.name || 'Unnamed team'}
                  </div>
                  {members.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-500">
                      No members found for this team.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2"
                        >
                          <div className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                            {member.full_name || member.user_email || 'Unknown user'}
                          </div>
                          {member.full_name && member.user_email && (
                            <div className="text-xs text-gray-500 dark:text-slate-500">
                              {member.user_email}
                            </div>
                          )}
                          <div className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                            {member.role === 'team_leader' ? 'Team leader' : 'Team member'}
                          </div>
                          {member.role === 'team_member' &&
                            currentUserLeadsTeam(member.team_id) && (
                              <button
                                type="button"
                                onClick={() => transferLeadership(member)}
                                disabled={transferringMemberId === member.id}
                                className="mt-3 inline-flex items-center text-xs font-semibold text-[var(--color-cyc-primary)] hover:text-teal-700 disabled:opacity-50"
                              >
                                <Crown className="mr-1 h-3.5 w-3.5" />
                                {transferringMemberId === member.id
                                  ? 'Transferring...'
                                  : 'Transfer leadership'}
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      )}
      {currentUserIsTeamLeader && (
        <section className="mb-6 bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                Team Requests
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-500">
                Approve or reject pending requests to join your teams.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchJoinRequests}
              disabled={loadingJoinRequests}
              className="text-sm font-semibold text-[var(--color-cyc-primary)] hover:text-teal-700 disabled:opacity-50"
            >
              {loadingJoinRequests ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {loadingJoinRequests ? (
              <div className="px-6 py-5 text-sm text-gray-500 dark:text-slate-500">
                Loading team requests...
              </div>
            ) : joinRequests.length === 0 ? (
              <div className="px-6 py-5 text-sm text-gray-500 dark:text-slate-500">
                No pending team requests.
              </div>
            ) : (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                      {request.user_email || 'Unknown user'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-slate-500">
                      Wants to join {request.team_name || 'Unknown team'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleJoinRequest(request.id, 'approve')}
                      disabled={updatingJoinRequestId === request.id}
                      className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJoinRequest(request.id, 'reject')}
                      disabled={updatingJoinRequestId === request.id}
                      className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-900/50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider"
              >
                Survey Title
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider"
              >
                Responses
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider"
              >
                Est. Time
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200">
            {filteredSurveys.map((survey) => (
              <tr
                key={survey.id}
                className="hover:bg-gray-50 dark:bg-slate-900/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100 flex items-center gap-2">
                    {survey.title}
                    {survey.category?.trim() && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-[var(--color-cyc-primary)]/10 text-[var(--color-cyc-primary)] px-2 py-0.5 rounded-full border border-[var(--color-cyc-primary)]/20">
                        {survey.category}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-500 line-clamp-1">
                    {survey.description?.replace(/<[^>]*>?/gm, '')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${survey.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200'}`}
                  >
                    {survey.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-500">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-[var(--color-cyc-primary)]" />
                    {survey.response_count || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {survey.estimated_minutes} min
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <Link
                      href={`/student/results/${survey.id}`}
                      className="text-[var(--color-cyc-secondary)] dark:text-slate-100 hover:text-blue-700 flex items-center"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Results
                    </Link>

                    <button
                      onClick={() => openShareModal(survey)}
                      className="text-purple-600 hover:text-purple-800 flex items-center"
                      title="Share Links"
                    >
                      <Share2 className="w-4 h-4 mr-1" />
                      Share
                    </button>

                    <button
                      onClick={() => handleToggleActive(survey)}
                      className={`flex items-center ${survey.is_active ? 'text-orange-500 hover:text-orange-700' : 'text-green-600 hover:text-green-800'}`}
                      title={survey.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4 mr-1" />
                      {survey.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    {!survey.has_been_published ? (
                      <Link
                        href={`/student/edit/${survey.id}`}
                        className="text-[var(--color-cyc-primary)] hover:text-teal-700 flex items-center"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Link>
                    ) : (
                      <Link
                        href={`/student/edit/${survey.id}`}
                        className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 flex items-center"
                        title="View locked survey or edit translations"
                      >
                        <Lock className="w-4 h-4 mr-1" />
                        View
                      </Link>
                    )}

                    <button
                      onClick={() => handleDuplicate(survey)}
                      className="text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:text-slate-300 flex items-center"
                      title="Duplicate Survey"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicate
                    </button>

                    {canDeleteSurvey(survey) && (
                      <button
                        onClick={() => handleDelete(survey)}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Delete Survey"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSurveys.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500 dark:text-slate-500"
                >
                  {surveys.length === 0
                    ? 'No surveys found. Create one to get started!'
                    : 'No surveys in this category.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Share Link Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShareModal(null)}
              className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-1 flex items-center">
              <Share2 className="w-5 h-5 mr-2" />
              Share Links
            </h2>
            <div className="flex justify-between items-center mb-5">
              <p className="text-sm text-gray-500 dark:text-slate-500">
                Generate unique tracked links for <strong>{shareModal.title}</strong>
              </p>
              <label className="flex items-center text-sm text-gray-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideZeroResponses}
                  onChange={(e) => setHideZeroResponses(e.target.checked)}
                  className="mr-2 rounded border-gray-300 text-[var(--color-cyc-primary)] focus:ring-[var(--color-cyc-primary)]"
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
                className="flex-grow p-2.5 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-[var(--color-cyc-primary)] focus:outline-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateLink();
                }}
              />
              <button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="px-4 py-2 bg-[var(--color-cyc-primary)] text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all whitespace-nowrap"
              >
                {generatingLink ? '...' : '+ Generate'}
              </button>
            </div>

            {/* List of generated links */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {shareLinks.length === 0 && (
                <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-8">
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
                      className="bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg p-3 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                            {link.label || (
                              <span className="text-gray-400 dark:text-slate-500 italic">
                                Unlabeled
                              </span>
                            )}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-mono">
                            {link.code}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-slate-500 font-medium">
                            {link.response_count} response{link.response_count !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => handleDeleteLink(link.id)}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-gray-500 dark:text-slate-500 truncate mr-2 flex-1">
                          {url}
                        </code>
                        <button
                          onClick={() => copyToClipboard(url, link.code)}
                          className={`flex items-center text-xs font-medium px-2 py-1 rounded transition-all ${isCopied ? 'bg-green-100 text-green-700' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-500 hover:text-[var(--color-cyc-primary)] hover:border-teal-300'}`}
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
          </div>
        </div>
      )}

      {/* Create Survey Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setCreateModal(false);
                setNewSurveyTitle('');
              }}
              className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-4 flex items-center">
              <PlusCircle className="w-5 h-5 mr-2" />
              Create New Survey
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Survey Title
              </label>
              <input
                type="text"
                autoFocus
                value={newSurveyTitle}
                onChange={(e) => setNewSurveyTitle(e.target.value)}
                placeholder="e.g. Employee Feedback 2024"
                className="w-full p-2.5 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[var(--color-cyc-primary)] focus:border-transparent outline-none transition-all"
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
                className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSurvey}
                disabled={creatingSurvey || !newSurveyTitle.trim()}
                className="px-4 py-2 bg-[var(--color-cyc-primary)] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {creatingSurvey ? 'Creating...' : 'Create Survey'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
