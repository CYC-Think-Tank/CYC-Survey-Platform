import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PendingTeamPage from '../page';

const mocks = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  fetchAdminMe: vi.fn(),
  push: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));
vi.mock('@/lib/adminAuth', () => ({
  adminFetch: mocks.adminFetch,
  fetchAdminMe: mocks.fetchAdminMe,
  parseJsonResponse: async (response: Response, message: string) => {
    const data = await response.json();
    if (!response.ok) throw new Error(message);
    return data;
  },
  ensureArray: (data: unknown) => data,
}));

const teams = [
  { id: 'team-1', name: 'CYC Admin' },
  { id: 'team-2', name: 'Research Team' },
];

describe('team onboarding', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.fetchAdminMe.mockResolvedValue({ teams: [], pending_requests: [] });
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => teams } as Response);
  });

  it('lets an unassigned user request an existing team', async () => {
    const pendingRequest = new Promise<Response>(() => {});
    mocks.adminFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/admin-api/team-join-requests' && init?.method === 'POST') {
        return pendingRequest;
      }
      return Promise.resolve({ ok: true, json: async () => teams } as Response);
    });

    render(<PendingTeamPage />);
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
    const pendingRequest = new Promise<Response>(() => {});
    mocks.adminFetch.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/admin-api/teams' && init?.method === 'POST') {
        return pendingRequest;
      }
      return Promise.resolve({ ok: true, json: async () => teams } as Response);
    });

    render(<PendingTeamPage />);
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

    render(<PendingTeamPage />);

    expect(await screen.findByText(/pending leader approval/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a team' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Access' })).not.toBeInTheDocument();
  });
});
