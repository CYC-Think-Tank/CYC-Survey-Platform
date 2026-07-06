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
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      adminFetch('/admin-api/teams')
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
      setMessage('Request sent. A team leader can approve it from team management.');
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
      window.location.href = '/student';
    } catch {
      setError('Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/student/login');
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(teamSearch.trim().toLowerCase())
  );
  const selectedVisibleTeam = filteredTeams.some((team) => team.id === selectedTeam)
    ? selectedTeam
    : filteredTeams[0]?.id || '';

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-lg">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
          Admin Account Ready
        </h1>
        <p className="text-gray-600 mt-3">
          Join an existing team or create a new one before managing surveys.
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
                Your team request is pending leader approval. You will get dashboard access after it
                is approved.
              </div>
            )}
            {pendingCount === 0 && (
              <>
                <div className="grid grid-cols-2 rounded-lg border border-gray-200 p-1">
                  <button
                    type="button"
                    onClick={() => setMode('join')}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'join' ? 'bg-teal text-white' : 'text-gray-600'}`}
                  >
                    Join a team
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === 'create' ? 'bg-teal text-white' : 'text-gray-600'}`}
                  >
                    Create a team
                  </button>
                </div>

                {mode === 'join' ? (
                  <>
                    <div>
                      <label
                        htmlFor="team-search"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Search teams
                      </label>
                      <input
                        id="team-search"
                        value={teamSearch}
                        onChange={(event) => setTeamSearch(event.target.value)}
                        placeholder="Search by team name"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-card text-ink focus:border-[var(--color-cyc-primary)] focus:outline-none"
                      />
                    </div>
                    {filteredTeams.length === 0 ? (
                      <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm">
                        No matching teams are available.
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor="team-request"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Team
                        </label>
                        <select
                          id="team-request"
                          value={selectedVisibleTeam}
                          onChange={(event) => setSelectedTeam(event.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl bg-card text-ink focus:border-[var(--color-cyc-primary)] focus:outline-none"
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
                      className="w-full btn-primary py-3 disabled:opacity-50"
                    >
                      {submitting ? 'Requesting...' : 'Request Access'}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="new-team-name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Team name
                      </label>
                      <input
                        id="new-team-name"
                        value={newTeamName}
                        onChange={(event) => setNewTeamName(event.target.value)}
                        placeholder="Enter a team name"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-card text-ink focus:border-[var(--color-cyc-primary)] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={createTeam}
                      disabled={!newTeamName.trim() || submitting}
                      className="w-full btn-primary py-3 disabled:opacity-50"
                    >
                      {submitting ? 'Creating...' : 'Create Team'}
                    </button>
                  </>
                )}
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
