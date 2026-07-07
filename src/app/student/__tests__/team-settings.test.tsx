import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentTeamSettingsPage from '../settings/page';
import { DashboardProvider } from '@/contexts/DashboardContext';

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  adminFetch: vi.fn(),
  fetchAdminMe: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.mockPush }) }));
vi.mock('@/lib/adminAuth', () => ({
  adminFetch: mocks.adminFetch,
  fetchAdminMe: mocks.fetchAdminMe,
  parseJsonResponse: async (response: Response, fallbackMessage: string) => {
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(fallbackMessage);
    return data;
  },
  ensureArray: (data: unknown, fallbackMessage: string) => {
    if (!Array.isArray(data)) throw new Error(fallbackMessage);
    return data;
  },
  isAdminFetchError: () => false,
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));

function renderTeamSettings() {
  return render(
    <DashboardProvider>
      <StudentTeamSettingsPage />
    </DashboardProvider>
  );
}

function mockFetchByUrl(handlers: Record<string, () => Response>) {
  mocks.adminFetch.mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    for (const [key, handler] of Object.entries(handlers)) {
      if (url === key || url.startsWith(key)) return Promise.resolve(handler());
    }
    return Promise.resolve({ ok: true, json: async () => [] } as Response);
  });
}

describe('Student TeamSettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lets a leader invite someone and approve join requests', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      user: { id: 'leader-1', email: 'leader@thecyc.org' },
      is_admin: false,
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_leader' }],
      pending_requests: [],
    });
    mockFetchByUrl({
      '/api/surveys?include_inactive=true': () => ({ ok: true, json: async () => [] }) as Response,
      '/admin-api/team-members': () =>
        ({
          ok: true,
          json: async () => [
            {
              id: 'm1',
              team_id: 'team-1',
              user_id: 'u1',
              user_email: 'leader@thecyc.org',
              role: 'team_leader',
            },
          ],
        }) as Response,
      '/admin-api/team-join-requests': () =>
        ({
          ok: true,
          json: async () => [
            { id: 'r1', team_id: 'team-1', user_id: 'u2', user_email: 'new@thecyc.org' },
          ],
        }) as Response,
      '/admin-api/team-invites': () => ({ ok: true, json: async () => [] }) as Response,
    });

    renderTeamSettings();

    await waitFor(() => {
      expect(screen.getByText('Invite someone')).toBeInTheDocument();
      expect(screen.getByText('new@thecyc.org')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith('/admin-api/team-join-requests/r1/approve', {
        method: 'POST',
      });
    });
  });

  it('lets a non-leader leave the team and hides leader-only sections', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      user: { id: 'user-1', email: 'member@thecyc.org' },
      is_admin: false,
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_member' }],
      pending_requests: [],
    });
    mockFetchByUrl({
      '/api/surveys?include_inactive=true': () => ({ ok: true, json: async () => [] }) as Response,
      '/admin-api/team-members': () =>
        ({
          ok: true,
          json: async () => [
            {
              id: 'm1',
              team_id: 'team-1',
              user_id: 'u1',
              user_email: 'member@thecyc.org',
              role: 'team_member',
            },
          ],
        }) as Response,
    });

    vi.stubGlobal('confirm', () => true);
    renderTeamSettings();

    await screen.findByText('CYC Admin', { exact: false });
    expect(screen.queryByText('Invite someone')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Requests')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Leave team' }));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith('/admin-api/team-members/leave', {
        method: 'POST',
      });
    });
  });
});
