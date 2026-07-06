'use client';
import { motion } from 'motion/react';
import { LogOut, ShieldCheck, Crown, Check, X } from 'lucide-react';
import { getAllowedAdminEmailDomain } from '@/lib/adminAuth';
import { useDashboard } from '@/contexts/DashboardContext';

export function SettingsPage() {
  const {
    role,
    adminEmail,
    handleLogout,
    teams,
    isTeamLeader,
    teamMembers,
    loadingTeamMembers,
    refetchTeamMembers,
    joinRequests,
    loadingJoinRequests,
    updatingJoinRequestId,
    handleJoinRequest,
    transferringMemberId,
    transferLeadership,
    leavingTeam,
    leaveTeam,
  } = useDashboard();
  const allowedDomain = getAllowedAdminEmailDomain();

  const currentUserLeadsTeam = (teamId: string) =>
    teams.some((team) => team.id === teamId && team.role === 'team_leader');

  const teamMemberGroups = teams.map((team) => ({
    team,
    members: teamMembers.filter((member) => member.team_id === team.id),
  }));

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage your account.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-4 font-display text-lg font-medium tracking-tight text-ink">Account</h2>
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-sm text-ink-soft">Email</p>
            <p className="font-medium text-ink">{adminEmail || 'Loading…'}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-ink">
            <ShieldCheck className="h-3.5 w-3.5" />
            {role === 'admin' ? 'Admin' : 'Team member'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="text-sm text-ink-soft">Access</p>
            <p className="text-sm text-ink">
              Restricted to <strong>@{allowedDomain || 'unconfigured'}</strong> accounts.
            </p>
          </div>
        </div>
      </motion.div>

      {role === 'student' && teams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mb-6 rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-display text-lg font-medium tracking-tight text-ink">
                Team Members
              </h2>
              <p className="text-sm text-ink-soft">View who has access to your team surveys.</p>
            </div>
            <div className="flex items-center gap-3">
              {!isTeamLeader && (
                <button
                  type="button"
                  onClick={leaveTeam}
                  disabled={leavingTeam}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
                >
                  {leavingTeam ? 'Leaving...' : 'Leave team'}
                </button>
              )}
              <button
                type="button"
                onClick={refetchTeamMembers}
                disabled={loadingTeamMembers}
                className="text-sm font-semibold text-ink-soft hover:text-ink disabled:opacity-50"
              >
                {loadingTeamMembers ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {isTeamLeader && (
              <div className="bg-amber-50 dark:bg-amber-500/10 px-6 py-3 text-sm text-amber-800 dark:text-amber-300">
                Transfer leadership to another member before leaving this team.
              </div>
            )}
            {loadingTeamMembers ? (
              <div className="px-6 py-5 text-sm text-ink-soft">Loading team members...</div>
            ) : teamMembers.length === 0 ? (
              <div className="px-6 py-5 text-sm text-ink-soft">No team members found.</div>
            ) : (
              teamMemberGroups.map(({ team, members }) => (
                <div key={team.id} className="px-6 py-4">
                  <div className="mb-3 text-sm font-bold text-ink">
                    {team.name || 'Unnamed team'}
                  </div>
                  {members.length === 0 ? (
                    <div className="text-sm text-ink-soft">No members found for this team.</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {members.map((member) => (
                        <div key={member.id} className="rounded-lg border border-border px-3 py-2">
                          <div className="text-sm font-semibold text-ink">
                            {member.full_name || member.user_email || 'Unknown user'}
                          </div>
                          {member.full_name && member.user_email && (
                            <div className="text-xs text-ink-soft">{member.user_email}</div>
                          )}
                          <div className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-ink-soft">
                            {member.role === 'team_leader' ? 'Team leader' : 'Team member'}
                          </div>
                          {member.role === 'team_member' &&
                            currentUserLeadsTeam(member.team_id) && (
                              <button
                                type="button"
                                onClick={() => transferLeadership(member)}
                                disabled={transferringMemberId === member.id}
                                className="mt-3 inline-flex items-center text-xs font-semibold text-ink transition-colors hover:opacity-70 disabled:opacity-50"
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
        </motion.div>
      )}

      {role === 'student' && isTeamLeader && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="font-display text-lg font-medium tracking-tight text-ink">
                Team Requests
              </h2>
              <p className="text-sm text-ink-soft">
                Approve or reject pending requests to join your teams.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {loadingJoinRequests ? (
              <div className="px-6 py-5 text-sm text-ink-soft">Loading team requests...</div>
            ) : joinRequests.length === 0 ? (
              <div className="px-6 py-5 text-sm text-ink-soft">No pending team requests.</div>
            ) : (
              joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {request.user_email || 'Unknown user'}
                    </div>
                    <div className="text-sm text-ink-soft">
                      Wants to join {request.team_name || 'Unknown team'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleJoinRequest(request.id, 'approve')}
                      disabled={updatingJoinRequestId === request.id}
                      className="inline-flex items-center rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJoinRequest(request.id, 'reject')}
                      disabled={updatingJoinRequestId === request.id}
                      className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="mb-1 font-display text-lg font-medium tracking-tight text-ink">Sign Out</h2>
        <p className="mb-4 text-sm text-ink-soft">
          You&apos;ll need to sign back in to manage surveys.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </motion.div>
    </div>
  );
}
