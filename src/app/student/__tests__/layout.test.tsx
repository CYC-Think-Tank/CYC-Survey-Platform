import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentLayout from '../layout';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  fetchAdminMe: vi.fn(),
  adminFetch: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  usePathname: () => '/student',
}));
vi.mock('@/lib/adminAuth', () => ({
  AdminFetchError: class AdminFetchError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  fetchAdminMe: mocks.fetchAdminMe,
  isAllowedAdminEmail: () => true,
  getAllowedAdminEmailDomain: () => 'thecyc.org',
  adminFetch: mocks.adminFetch,
  ensureArray: (data: unknown) => (Array.isArray(data) ? data : []),
  isAdminFetchError: () => false,
  parseJsonResponse: async (response: Response) => response.json().catch(() => null),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession, signOut: mocks.signOut } },
}));

describe('StudentLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { email: 'person@thecyc.org' } } },
    });
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
  });

  it('does not render dashboard children while redirecting an unassigned user', async () => {
    mocks.fetchAdminMe.mockResolvedValue({ is_admin: false, teams: [], pending_requests: [] });

    render(
      <StudentLayout>
        <div>Dashboard child mounted</div>
      </StudentLayout>
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/student/teams');
    });
    expect(screen.queryByText('Dashboard child mounted')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard children after membership is confirmed', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      is_admin: false,
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_member' }],
    });

    render(
      <StudentLayout>
        <div>Dashboard child mounted</div>
      </StudentLayout>
    );

    expect(await screen.findByText('Dashboard child mounted')).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects a global admin to the admin area', async () => {
    mocks.fetchAdminMe.mockResolvedValue({ is_admin: true, teams: [], pending_requests: [] });

    render(
      <StudentLayout>
        <div>Dashboard child mounted</div>
      </StudentLayout>
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/admin');
    });
    expect(screen.queryByText('Dashboard child mounted')).not.toBeInTheDocument();
  });
});
