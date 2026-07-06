import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentTeamsPage from '../page';

const mocks = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  fetchAdminMe: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));
vi.mock('@/lib/adminAuth', () => ({
  adminFetch: mocks.adminFetch,
  fetchAdminMe: mocks.fetchAdminMe,
  isAdminFetchError: () => false,
  parseJsonResponse: async (response: Response, message: string) => {
    const data = await response.json();
    if (!response.ok) throw new Error(message);
    return data;
  },
  ensureArray: (data: unknown) => data,
}));

const browsableTeams = [
  { id: 'team-1', name: 'CYC Admin' },
  { id: 'team-2', name: 'Research Team' },
];

function mockFetchByUrl(handlers: Record<string, () => Promise<Response> | Response>) {
  mocks.adminFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    for (const [key, handler] of Object.entries(handlers)) {
      if (url === key || url.startsWith(key)) return Promise.resolve(handler());
    }
    return Promise.resolve({ ok: true, json: async () => [] } as Response);
  });
}

describe('teams hub — no team yet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetchAdminMe.mockResolvedValue({ teams: [], pending_requests: [] });
    mockFetchByUrl({
      '/admin-api/teams': () => ({ ok: true, json: async () => browsableTeams }) as Response,
      '/admin-api/my-invites': () => ({ ok: true, json: async () => [] }) as Response,
    });
  });

  it('lets an unassigned user request an existing team', async () => {
    render(<StudentTeamsPage />);
    await screen.findByText('CYC Admin');
    fireEvent.click(screen.getByRole('button', { name: 'Request Access' }));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith('/admin-api/team-join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: 'team-1' }),
      });
    });
  });

  it('lets an unassigned user submit a new team name', async () => {
    render(<StudentTeamsPage />);
    await screen.findByText('CYC Admin');
    fireEvent.click(screen.getByRole('button', { name: 'Create a team' }));
    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Policy Team' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Team' }));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith('/admin-api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Policy Team' }),
      });
    });
  });

  it('shows a pending state instead of onboarding actions', async () => {
    mocks.fetchAdminMe.mockResolvedValue({ teams: [], pending_requests: [{ id: 'request-1' }] });

    render(<StudentTeamsPage />);

    expect(await screen.findByText(/pending leader approval/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Access' })).not.toBeInTheDocument();
  });

  it('shows pending invites and accepts one', async () => {
    mockFetchByUrl({
      '/admin-api/teams': () => ({ ok: true, json: async () => browsableTeams }) as Response,
      '/admin-api/my-invites': () =>
        ({
          ok: true,
          json: async () => [{ id: 'invite-1', team_id: 'team-1', team_name: 'CYC Admin' }],
        }) as Response,
      '/admin-api/team-invites/invite-1/accept': () =>
        ({ ok: true, json: async () => ({ success: true, team_id: 'team-1' }) }) as Response,
    });

    render(<StudentTeamsPage />);
    await screen.findByText('Invites');
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith('/admin-api/team-invites/invite-1/accept', {
        method: 'POST',
      });
    });
  });
});

describe('teams hub — already on a team', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lets team leaders approve pending team requests and see their sent invites', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_leader' }],
      pending_requests: [],
    });
    mockFetchByUrl({
      '/admin-api/team-members': () =>
        ({
          ok: true,
          json: async () => [
            {
              id: 'member-1',
              team_id: 'team-1',
              user_id: 'user-1',
              user_email: 'leader@example.com',
              role: 'team_leader',
            },
            {
              id: 'member-2',
              team_id: 'team-1',
              user_id: 'user-2',
              user_email: 'member@example.com',
              role: 'team_member',
            },
          ],
        }) as Response,
      '/admin-api/team-join-requests': () =>
        ({
          ok: true,
          json: async () => [
            {
              id: 'request-1',
              team_id: 'team-1',
              user_id: 'user-3',
              user_email: 'new@example.com',
            },
          ],
        }) as Response,
      '/admin-api/team-invites': () =>
        ({
          ok: true,
          json: async () => [
            {
              id: 'invite-1',
              team_id: 'team-1',
              invited_email: 'pending@example.com',
              status: 'pending',
            },
          ],
        }) as Response,
      '/admin-api/team-join-requests/request-1/approve': () =>
        ({ ok: true, json: async () => ({ success: true }) }) as Response,
    });

    render(<StudentTeamsPage />);

    await waitFor(() => {
      expect(screen.getByText('leader@example.com')).toBeInTheDocument();
      expect(screen.getByText('Transfer leadership')).toBeInTheDocument();
      expect(screen.getByText('new@example.com')).toBeInTheDocument();
      expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith(
        '/admin-api/team-join-requests/request-1/approve',
        { method: 'POST' }
      );
    });
  });

  it('lets a non-leader leave the team', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_member' }],
      pending_requests: [],
    });
    mockFetchByUrl({
      '/admin-api/team-members': () =>
        ({
          ok: true,
          json: async () => [
            {
              id: 'member-1',
              team_id: 'team-1',
              user_id: 'user-1',
              user_email: 'me@example.com',
              role: 'team_member',
            },
          ],
        }) as Response,
      '/admin-api/team-members/leave': () =>
        ({ ok: true, json: async () => ({ success: true }) }) as Response,
    });
    vi.stubGlobal('confirm', () => true);

    render(<StudentTeamsPage />);
    await screen.findByText('CYC Admin');
    fireEvent.click(screen.getByRole('button', { name: 'Leave team' }));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith('/admin-api/team-members/leave', {
        method: 'POST',
      });
    });
  });
});
