'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Crown, Mail, Trash2, X } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useTeamManagement } from '@/hooks/useTeamManagement';

export function TeamSettingsPage() {
  const { teams } = useDashboard();
  const {
    currentTeam,
    isTeamLeader,
    error,
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
  const [message, setMessage] = useState('');

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

  const handleLeaveTeam = () => leaveTeam(() => (window.location.href = '/student/teams'));

  if (!currentTeam) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Team Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          You&apos;re not on a team yet. Head over to the{' '}
          <a href="/student/teams" className="underline hover:text-ink">
            teams hub
          </a>{' '}
          to join or create one.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">Team Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {currentTeam.name || 'Unnamed team'} · {isTeamLeader ? 'Team leader' : 'Team member'}
        </p>
      </motion.div>

      {(error || message) && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'
              : 'border-border bg-card text-ink'
          }`}
        >
          {error || message}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">Members</h2>
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
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
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
                {isTeamLeader && member.role === 'team_member' && (
                  <button
                    type="button"
                    onClick={() => transferLeadership(member)}
                    disabled={transferringMemberId === member.id}
                    className="mt-3 flex items-center text-xs font-semibold text-ink transition-colors hover:opacity-70 disabled:opacity-50"
                  >
                    <Crown className="mr-1 h-3.5 w-3.5" />
                    {transferringMemberId === member.id ? 'Transferring...' : 'Transfer leadership'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {isTeamLeader && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 rounded-2xl border border-border bg-card p-6"
        >
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
        </motion.div>
      )}

      {isTeamLeader && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
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
        </motion.div>
      )}
    </div>
  );
}
