'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, ensureArray, fetchAdminMe, parseJsonResponse } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';

interface Team {
  id: string;
  name: string;
}

export default function PendingTeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/teams')
        .then((res) => parseJsonResponse<unknown>(res, 'Could not load teams.'))
        .then((data) => ensureArray<Team>(data, 'Unexpected team response from API')),
      fetchAdminMe(),
    ])
      .then(([teamData, me]) => {
        setTeams(teamData);
        setSelectedTeam(teamData[0] ? teamData[0].id : '');
        setPendingCount(me.pending_requests.length);
      })
      .catch(() => setError('Could not load team information.'))
      .finally(() => setLoading(false));
  }, []);

  const requestAccess = async () => {
    if (!selectedTeam) return;
    setError('');
    setMessage('');
    setSubmitting(true);
    const res = await adminFetch('/admin-api/team-join-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: selectedTeam }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || data.error || 'Failed to request team access.');
      setSubmitting(false);
      return;
    }
    setMessage('Request sent. A team leader can approve it from team management.');
    setPendingCount((count) => count + 1);
    setSubmitting(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-lg">
        <h1 className="text-2xl font-bold text-[var(--color-cyc-secondary)]">
          Admin Account Ready
        </h1>
        <p className="text-gray-600 mt-3">
          Your account is authenticated. Choose an existing team to request access before managing
          surveys.
        </p>

        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-cyc-primary)]"></div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
            {message && (
              <div className="bg-teal-50 text-teal-700 p-3 rounded text-sm">{message}</div>
            )}
            {pendingCount > 0 && (
              <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm">
                You already have {pendingCount} pending team request{pendingCount === 1 ? '' : 's'}.
              </div>
            )}
            {teams.length === 0 ? (
              <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm">
                No teams are available yet. Ask an existing administrator to create a team before
                requesting access.
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="team-request"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Request a team
                  </label>
                  <select
                    id="team-request"
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-[var(--color-cyc-primary)] focus:ring-4 focus:ring-teal-50 focus:outline-none transition-all"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={requestAccess}
                  disabled={!selectedTeam || submitting || pendingCount > 0}
                  className="w-full btn-primary py-3 disabled:opacity-50"
                >
                  {submitting
                    ? 'Requesting...'
                    : pendingCount > 0
                      ? 'Request Pending'
                      : 'Request Access'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={signOut}
              className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
