import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '../page';

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
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.mockPush.mockClear();
    mocks.fetchAdminMe.mockResolvedValue({ teams: [] });
  });

  it('renders loading state initially', () => {
    mocks.adminFetch.mockImplementation(() => new Promise(() => {}));
    render(<AdminDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard with surveys after loading', async () => {
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
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active Survey')).toBeInTheDocument();
      expect(screen.getByText('Draft Survey')).toBeInTheDocument();
    });
  });

  it('shows survey status badges', async () => {
    const mockSurveys = [
      {
        id: 'survey-1',
        title: 'Active Survey',
        is_active: true,
        response_count: 10,
        estimated_minutes: 5,
        has_been_published: true,
      },
    ];
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => mockSurveys } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('renders empty state when no surveys', async () => {
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No surveys found. Create one to get started!')).toBeInTheDocument();
    });
  });

  it('has link to create new survey', async () => {
    mocks.adminFetch.mockResolvedValue({ ok: true, json: async () => [] } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      const newSurveyLink = screen.getByText('New Survey');
      expect(newSurveyLink.closest('a')).toHaveAttribute('href', '/admin/create');
    });
  });

  it('lets team leaders approve pending team requests', async () => {
    mocks.fetchAdminMe.mockResolvedValue({
      teams: [{ id: 'team-1', name: 'CYC Admin', role: 'team_leader' }],
    });
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

    render(<AdminDashboard />);

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
