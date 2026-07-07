'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminFetch,
  ensureArray,
  fetchAdminMe,
  parseJsonResponse,
  type AdminTeam,
} from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { ArrowRight, Check, Crown, Home, LogOut, Mail, Trash2, X } from 'lucide-react';

interface BrowsableTeam {
  id: string;
  name: string;
}

interface MyInvite {
  id: string;
  team_id: string;
  team_name?: string | null;
  created_at?: string;
}

export default function StudentTeamsPage() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // No-team state
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [browsableTeams, setBrowsableTeams] = useState<BrowsableTeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [myInvites, setMyInvites] = useState<MyInvite[]>([]);
  const [resolvingInviteId, setResolvingInviteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    currentTeam,
    isTeamLeader,
    error: teamMgmtError,
    teamMembers,
    loadingTeamMembers,
    joinRequests,
    updatingJoinRequestId,
    handleJoinRequest,
    sentInvites,
    sendingInvite,
    sendInvite,
    revokingInviteId,
    revokeInvite,
    transferringMemberId,
    transferLeadership,
    leavingTeam,
    leaveTeam,
  } = useTeamManagement(teams);

  const [inviteEmail, setInviteEmail] = useState('');

  const loadAll = () => {
    setLoading(true);
    fetchAdminMe()
      .then((me) => {
        setTeams(me.teams);
        setPendingCount(me.pending_requests.length);
        if (me.teams.length === 0) {
          Promise.all([
            adminFetch('/admin-api/teams')
              .then((res) => parseJsonResponse<unknown>(res, 'Could not load teams.'))
              .then((data) => ensureArray<BrowsableTeam>(data, 'Unexpected team response')),
            adminFetch('/admin-api/my-invites')
              .then((res) => parseJsonResponse<unknown>(res, 'Could not load invites.'))
              .then((data) => ensureArray<MyInvite>(data, 'Unexpected invite response')),
          ])
            .then(([teamData, invites]) => {
              setBrowsableTeams(teamData);
              setSelectedTeam(teamData[0] ? teamData[0].id : '');
              setMyInvites(invites);
            })
            .catch(() => setError('Could not load team information.'))
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setTeams([]);
        setError('Could not load team information.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredTeams = browsableTeams.filter((team) =>
    team.name.toLowerCase().includes(teamSearch.trim().toLowerCase())
  );
  const selectedVisibleTeam = filteredTeams.some((team) => team.id === selectedTeam)
    ? selectedTeam
    : filteredTeams[0]?.id || '';

  const requestAccess = async () => {
    const targetTeamId = filteredTeams.some((team) => team.id === selectedTeam)
      ? selectedTeam
      : filteredTeams[0]?.id;
    if (!targetTeamId) return;
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await adminFetch('/admin-api/team-join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: targetTeamId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || 'Failed to request team access.');
        return;
      }
      setMessage('Request sent. A team leader can approve it from their team page.');
      setPendingCount(1);
    } catch {
      setError('Failed to request team access.');
    } finally {
      setSubmitting(false);
    }
  };

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name) return;
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await adminFetch('/admin-api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || 'Failed to create team.');
        return;
      }
      setNewTeamName('');
      loadAll();
    } catch {
      setError('Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  const resolveInvite = async (inviteId: string, action: 'accept' | 'decline') => {
    setResolvingInviteId(inviteId);
    setError('');
    try {
      const res = await adminFetch(`/admin-api/team-invites/${inviteId}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || `Failed to ${action} invite.`);
        return;
      }
      loadAll();
    } catch {
      setError(`Failed to ${action} invite.`);
    } finally {
      setResolvingInviteId(null);
    }
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setMessage('');
    const ok = await sendInvite(email);
    if (ok) {
      setInviteEmail('');
      setMessage(`Invite sent to ${email}.`);
    }
  };

  const handleLeaveTeam = () => leaveTeam(loadAll);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/student/login';
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <Home className="h-4 w-4" />
            Back to site
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Teams</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {currentTeam
              ? 'Manage your team, then head into the survey dashboard.'
              : 'Join an existing team or create a new one to get started.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ink"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {(error || teamMgmtError) && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {error || teamMgmtError}
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-ink">
                {message}
              </div>
            )}

            {currentTeam ? (
              <>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-ink-soft">Your team</p>
                      <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-ink">
                        {currentTeam.name || 'Unnamed team'}
                      </h2>
                      <p className="mt-1 text-sm text-ink-soft">
                        {isTeamLeader ? 'Team leader' : 'Team member'}
                      </p>
                    </div>
                    <Link
                      href="/student"
                      className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-cream transition-opacity hover:opacity-90"
                    >
                      Enter Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-6 border-t border-border pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">Members</p>
                      {!isTeamLeader && (
                        <button
                          type="button"
                          onClick={handleLeaveTeam}
                          disabled={leavingTeam}
                          className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                        >
                          {leavingTeam ? 'Leaving...' : 'Leave team'}
                        </button>
                      )}
                    </div>
                    {isTeamLeader && (
                      <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                        Transfer leadership to another member before you can leave this team.
                      </div>
                    )}
                    {loadingTeamMembers ? (
                      <p className="text-sm text-ink-soft">Loading members...</p>
                    ) : teamMembers.length === 0 ? (
                      <p className="text-sm text-ink-soft">No members found.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {teamMembers.map((member) => (
                          <div
                            key={member.id}
                            className="rounded-lg border border-border px-3 py-2"
                          >
                            <div className="text-sm font-semibold text-ink">
                              {member.full_name || member.user_email || 'Unknown user'}
                            </div>
                            {member.full_name && member.user_email && (
                              <div className="text-xs text-ink-soft">{member.user_email}</div>
                            )}
                            <div className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-ink-soft">
                              {member.role === 'team_leader' ? 'Team leader' : 'Team member'}
                            </div>
                            {isTeamLeader && member.role === 'team_member' && (
                              <button
                                type="button"
                                onClick={() => transferLeadership(member)}
                                disabled={transferringMemberId === member.id}
                                className="mt-3 flex items-center text-xs font-semibold text-ink transition-colors hover:opacity-70 disabled:opacity-50"
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
                </div>

                {isTeamLeader && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="font-display text-lg font-medium tracking-tight text-ink">
                      Invite someone
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      They&apos;ll see this as a pending invite next time they sign in.
                    </p>
                    <div className="mt-4 flex gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="name@thecyc.org"
                        className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendInvite();
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSendInvite}
                        disabled={sendingInvite || !inviteEmail.trim()}
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Mail className="h-4 w-4" />
                        {sendingInvite ? 'Sending...' : 'Invite'}
                      </button>
                    </div>

                    {sentInvites.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {sentInvites.map((invite) => (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                          >
                            <span className="text-ink">{invite.invited_email}</span>
                            <button
                              type="button"
                              onClick={() => revokeInvite(invite.id)}
                              disabled={revokingInviteId === invite.id}
                              className="flex items-center gap-1 text-xs font-semibold text-ink-soft transition-colors hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Revoke
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isTeamLeader && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="font-display text-lg font-medium tracking-tight text-ink">
                      Team Requests
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      Approve or reject requests from people asking to join your team.
                    </p>
                    <div className="mt-4 space-y-2">
                      {joinRequests.length === 0 ? (
                        <p className="text-sm text-ink-soft">No pending team requests.</p>
                      ) : (
                        joinRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="text-sm font-semibold text-ink">
                              {request.user_email || 'Unknown user'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleJoinRequest(request.id, 'approve')}
                                disabled={updatingJoinRequestId === request.id}
                                className="inline-flex items-center rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleJoinRequest(request.id, 'reject')}
                                disabled={updatingJoinRequestId === request.id}
                                className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
                              >
                                <X className="mr-1 h-4 w-4" />
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {myInvites.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="font-display text-lg font-medium tracking-tight text-ink">
                      Invites
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                      Teams that have invited you to join.
                    </p>
                    <div className="mt-4 space-y-2">
                      {myInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex flex-col gap-3 rounded-lg border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="text-sm font-semibold text-ink">
                            {invite.team_name || 'Unnamed team'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => resolveInvite(invite.id, 'accept')}
                              disabled={resolvingInviteId === invite.id}
                              className="inline-flex items-center rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
                            >
                              <Check className="mr-1 h-4 w-4" />
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => resolveInvite(invite.id, 'decline')}
                              disabled={resolvingInviteId === invite.id}
                              className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
                            >
                              <X className="mr-1 h-4 w-4" />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-border bg-card p-6">
                  {pendingCount > 0 ? (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                      Your team request is pending leader approval. You&apos;ll see your team here
                      once it&apos;s approved.
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 rounded-lg border border-border p-1">
                        <button
                          type="button"
                          onClick={() => setMode('join')}
                          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${mode === 'join' ? 'bg-ink text-cream' : 'text-ink-soft'}`}
                        >
                          Join a team
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('create')}
                          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${mode === 'create' ? 'bg-ink text-cream' : 'text-ink-soft'}`}
                        >
                          Create a team
                        </button>
                      </div>

                      {mode === 'join' ? (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label
                              htmlFor="team-search"
                              className="mb-1 block text-sm font-medium text-ink-soft"
                            >
                              Search teams
                            </label>
                            <input
                              id="team-search"
                              value={teamSearch}
                              onChange={(event) => setTeamSearch(event.target.value)}
                              placeholder="Search by team name"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                          {filteredTeams.length === 0 ? (
                            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-500/10 dark:text-blue-300">
                              No matching teams are available.
                            </div>
                          ) : (
                            <div>
                              <label
                                htmlFor="team-request"
                                className="mb-1 block text-sm font-medium text-ink-soft"
                              >
                                Team
                              </label>
                              <select
                                id="team-request"
                                value={selectedVisibleTeam}
                                onChange={(event) => setSelectedTeam(event.target.value)}
                                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
                              >
                                {filteredTeams.map((team) => (
                                  <option key={team.id} value={team.id}>
                                    {team.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={requestAccess}
                            disabled={!selectedVisibleTeam || submitting}
                            className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {submitting ? 'Requesting...' : 'Request Access'}
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div>
                            <label
                              htmlFor="new-team-name"
                              className="mb-1 block text-sm font-medium text-ink-soft"
                            >
                              Team name
                            </label>
                            <input
                              id="new-team-name"
                              value={newTeamName}
                              onChange={(event) => setNewTeamName(event.target.value)}
                              placeholder="Enter a team name"
                              className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={createTeam}
                            disabled={!newTeamName.trim() || submitting}
                            className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {submitting ? 'Creating...' : 'Create Team'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
