import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from '../layout';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  fetchAdminMe: vi.fn(),
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin',
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
}));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession, signOut: mocks.signOut } },
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { email: 'person@thecyc.org' } } },
    });
  });

  it('does not render dashboard children while redirecting an unassigned user', async () => {
    mocks.fetchAdminMe.mockResolvedValue({ teams: [], pending_requests: [] });

    render(
      <AdminLayout>
        <div>Dashboard child mounted</div>
      </AdminLayout>
    );

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/admin/pending-team');
    });
    expect(screen.queryByText('Dashboard child mounted')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard children after membership is confirmed', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_member' }],
    });

    render(
      <AdminLayout>
        <div>Dashboard child mounted</div>
      </AdminLayout>
    );

    expect(await screen.findByText('Dashboard child mounted')).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
