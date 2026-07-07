import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentOverviewPage from '../page';
import { DashboardProvider } from '@/contexts/DashboardContext';

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  adminFetch: vi.fn(),
  fetchAdminMe: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.mockPush }) }));
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
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

function renderOverview() {
  return render(
    <DashboardProvider>
      <StudentOverviewPage />
    </DashboardProvider>
  );
}

describe('Student OverviewPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockPush.mockClear();
    mocks.fetchAdminMe.mockResolvedValue({
      user: { id: 'user-1', email: 'person@thecyc.org' },
      is_admin: false,
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_member' }],
      pending_requests: [],
    });
  });

  it('renders loading state initially', () => {
    mocks.adminFetch.mockImplementation(() => new Promise(() => {}));
    renderOverview();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard stats after loading', async () => {
    const mockSurveys = [
      {
        id: 'survey-1',
        title: 'Active Survey',
        description: 'Description',
        is_active: true,
        response_count: 10,
        estimated_minutes: 5,
        has_been_published: true,
      },
      {
        id: 'survey-2',
        title: 'Draft Survey',
        description: 'Draft',
        is_active: false,
        response_count: 0,
        estimated_minutes: 3,
        has_been_published: false,
      },
    ];
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => mockSurveys } as Response);
    renderOverview();
    await waitFor(() => {
      expect(screen.getByText('Active Survey')).toBeInTheDocument();
      expect(screen.getByText('Draft Survey')).toBeInTheDocument();
    });
  });

  it('renders empty state when no surveys', async () => {
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    renderOverview();
    await waitFor(() => {
      expect(
        screen.getByText('No surveys yet. Create one to see responses here.')
      ).toBeInTheDocument();
    });
  });

  it('shows the raffle wheel quick action for team leaders only', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      user: { id: 'user-1', email: 'leader@thecyc.org' },
      is_admin: false,
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_leader' }],
      pending_requests: [],
    });
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    renderOverview();
    await waitFor(() => {
      expect(screen.getByText('Raffle Wheel')).toBeInTheDocument();
    });
  });

  it('hides admin-only quick actions for students', async () => {
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    renderOverview();
    await waitFor(() => {
      expect(screen.getByText('Manage Team')).toBeInTheDocument();
    });
    expect(screen.queryByText('Remind Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Global Share Links')).not.toBeInTheDocument();
  });
});
