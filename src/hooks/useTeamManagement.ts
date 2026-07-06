'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  adminFetch,
  ensureArray,
  isAdminFetchError,
  parseJsonResponse,
  type AdminTeam,
} from '@/lib/adminAuth';

export interface TeamMember {
  id: string;
  team_id: string;
  team_name?: string | null;
  user_id: string;
  user_email?: string | null;
  full_name?: string | null;
  role: 'team_leader' | 'team_member';
}

export interface TeamJoinRequest {
  id: string;
  team_id: string;
  team_name?: string | null;
  user_id: string;
  user_email?: string | null;
  requested_at?: string;
}

export interface SentInvite {
  id: string;
  team_id: string;
  invited_email: string;
  status: string;
  created_at?: string;
}

// Shared by the pre-dashboard teams hub and the in-dashboard Team Settings
// page — both need the same member/invite/join-request/transfer/leave
// actions for whichever team the caller currently belongs to.
export function useTeamManagement(teams: AdminTeam[]) {
  const currentTeam = teams[0] || null;
  const isTeamLeader = currentTeam?.role === 'team_leader';

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);
  const [updatingJoinRequestId, setUpdatingJoinRequestId] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [loadingSentInvites, setLoadingSentInvites] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [transferringMemberId, setTransferringMemberId] = useState<string | null>(null);
  const [leavingTeam, setLeavingTeam] = useState(false);
  const [error, setError] = useState('');

  const refetchTeamMembers = useCallback(() => {
    if (!currentTeam) return;
    setLoadingTeamMembers(true);
    adminFetch('/admin-api/team-members')
      .then((res) => parseJsonResponse<unknown>(res, 'Could not load team members.'))
      .then((data) => setTeamMembers(ensureArray<TeamMember>(data, 'Unexpected response')))
      .catch(() => setTeamMembers([]))
      .finally(() => setLoadingTeamMembers(false));
  }, [currentTeam]);

  const refetchJoinRequests = useCallback(() => {
    if (!isTeamLeader) return;
    setLoadingJoinRequests(true);
    adminFetch('/admin-api/team-join-requests')
      .then((res) => parseJsonResponse<unknown>(res, 'Could not load team requests.'))
      .then((data) => setJoinRequests(ensureArray<TeamJoinRequest>(data, 'Unexpected response')))
      .catch(() => setJoinRequests([]))
      .finally(() => setLoadingJoinRequests(false));
  }, [isTeamLeader]);

  const refetchSentInvites = useCallback(() => {
    if (!isTeamLeader) return;
    setLoadingSentInvites(true);
    adminFetch('/admin-api/team-invites')
      .then((res) => parseJsonResponse<unknown>(res, 'Could not load invites.'))
      .then((data) => setSentInvites(ensureArray<SentInvite>(data, 'Unexpected response')))
      .catch(() => setSentInvites([]))
      .finally(() => setLoadingSentInvites(false));
  }, [isTeamLeader]);

  useEffect(() => {
    refetchTeamMembers();
    refetchJoinRequests();
    refetchSentInvites();
    // Only re-run when the team/role identity actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeam?.id, isTeamLeader]);

  const sendInvite = useCallback(async (email: string) => {
    setError('');
    setSendingInvite(true);
    try {
      const res = await adminFetch('/admin-api/team-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || 'Failed to send invite.');
        return false;
      }
      refetchSentInvites();
      return true;
    } catch {
      setError('Failed to send invite.');
      return false;
    } finally {
      setSendingInvite(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revokeInvite = useCallback(async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    try {
      await adminFetch(`/admin-api/team-invites/${inviteId}`, { method: 'DELETE' });
      setSentInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
    } catch {
      setError('Failed to revoke invite.');
    } finally {
      setRevokingInviteId(null);
    }
  }, []);

  const handleJoinRequest = useCallback(async (requestId: string, action: 'approve' | 'reject') => {
    setUpdatingJoinRequestId(requestId);
    try {
      const res = await adminFetch(`/admin-api/team-join-requests/${requestId}/${action}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || `Failed to ${action} request.`);
        return;
      }
      setJoinRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (err) {
      if (!isAdminFetchError(err)) console.error(err);
      setError(`Failed to ${action} request.`);
    } finally {
      setUpdatingJoinRequestId(null);
    }
  }, []);

  const transferLeadership = useCallback(async (member: TeamMember) => {
    const memberLabel = member.full_name || member.user_email || 'this member';
    const confirmed = window.confirm(
      `Transfer leadership to ${memberLabel}? You will become a regular team member and only the new leader will be able to manage requests or invite people.`
    );
    if (!confirmed) return;

    setTransferringMemberId(member.id);
    try {
      const res = await adminFetch('/admin-api/team-members/transfer-leadership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: member.team_id, new_leader_user_id: member.user_id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || 'Failed to transfer leadership.');
        return;
      }
      window.location.reload();
    } catch (err) {
      if (!isAdminFetchError(err)) console.error(err);
      setError('Failed to transfer leadership.');
    } finally {
      setTransferringMemberId(null);
    }
  }, []);

  const leaveTeam = useCallback(async (onLeft?: () => void) => {
    const confirmed = window.confirm(
      'Leave this team? You will lose access to its surveys and return to team onboarding.'
    );
    if (!confirmed) return;

    setLeavingTeam(true);
    try {
      const res = await adminFetch('/admin-api/team-members/leave', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.error || 'Failed to leave team.');
        return;
      }
      onLeft?.();
    } catch (err) {
      if (!isAdminFetchError(err)) console.error(err);
      setError('Failed to leave team.');
    } finally {
      setLeavingTeam(false);
    }
  }, []);

  return {
    currentTeam,
    isTeamLeader,
    error,
    teamMembers,
    loadingTeamMembers,
    refetchTeamMembers,
    joinRequests,
    loadingJoinRequests,
    updatingJoinRequestId,
    handleJoinRequest,
    sentInvites,
    loadingSentInvites,
    sendingInvite,
    sendInvite,
    revokingInviteId,
    revokeInvite,
    transferringMemberId,
    transferLeadership,
    leavingTeam,
    leaveTeam,
  };
}
