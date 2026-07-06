import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentSettingsPage from '../settings/page';
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
  getAllowedAdminEmailDomain: () => 'thecyc.org',
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

function renderSettings() {
  return render(
    <DashboardProvider>
      <StudentSettingsPage />
    </DashboardProvider>
  );
}

describe('Student SettingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetchAdminMe.mockResolvedValue({
      user: { id: 'user-1', email: 'leader@thecyc.org' },
      is_admin: false,
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_leader' }],
      pending_requests: [],
    });
  });

  it('lets team leaders approve pending team requests', async () => {
    mocks.adminFetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/surveys?include_inactive=true') {
        return Promise.resolve({ ok: true, json: async () => [] } as Response);
      }
      if (url === '/admin-api/team-members') {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'member-1',
              team_id: 'team-1',
              team_name: 'CYC Admin',
              user_id: 'user-1',
              user_email: 'leader@example.com',
              role: 'team_leader',
            },
            {
              id: 'member-2',
              team_id: 'team-1',
              team_name: 'CYC Admin',
              user_id: 'user-2',
              user_email: 'member@example.com',
              role: 'team_member',
            },
          ],
        } as Response);
      }
      if (url === '/admin-api/team-join-requests') {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'request-1',
              team_id: 'team-1',
              team_name: 'CYC Admin',
              user_id: 'user-2',
              user_email: 'member@example.com',
            },
          ],
        } as Response);
      }
      if (url === '/admin-api/team-join-requests/request-1/approve') {
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    });

    renderSettings();

    await waitFor(() => {
      expect(screen.getByText('Team Members')).toBeInTheDocument();
      expect(screen.getByText('leader@example.com')).toBeInTheDocument();
      expect(screen.getByText('Transfer leadership')).toBeInTheDocument();
      expect(screen.getByText('Team Requests')).toBeInTheDocument();
      expect(screen.getAllByText('member@example.com')).toHaveLength(2);
    });

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(mocks.adminFetch).toHaveBeenCalledWith(
        '/admin-api/team-join-requests/request-1/approve',
        { method: 'POST' }
      );
    });
  });
});
