import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDashboard from '../page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));

global.fetch = vi.fn();

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPush.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(() => 'true'), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  it('renders loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));
    render(<AdminDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard with surveys after loading', async () => {
    const mockSurveys = [
      { id: 'survey-1', title: 'Active Survey', description: 'Description', is_active: true, response_count: 10, estimated_minutes: 5, has_been_published: true },
      { id: 'survey-2', title: 'Draft Survey', description: 'Draft', is_active: false, response_count: 0, estimated_minutes: 3, has_been_published: false },
    ];
    vi.mocked(fetch).mockResolvedValue({ json: async () => mockSurveys } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active Survey')).toBeInTheDocument();
      expect(screen.getByText('Draft Survey')).toBeInTheDocument();
    });
  });

  it('shows survey status badges', async () => {
    const mockSurveys = [{ id: 'survey-1', title: 'Active Survey', is_active: true, response_count: 10, estimated_minutes: 5, has_been_published: true }];
    vi.mocked(fetch).mockResolvedValue({ json: async () => mockSurveys } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('renders empty state when no surveys', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => [] } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No surveys found. Create one to get started!')).toBeInTheDocument();
    });
  });

  it('has link to create new survey', async () => {
    vi.mocked(fetch).mockResolvedValue({ json: async () => [] } as Response);
    render(<AdminDashboard />);
    await waitFor(() => {
      const newSurveyLink = screen.getByText('New Survey');
      expect(newSurveyLink.closest('a')).toHaveAttribute('href', '/admin/create');
    });
  });
});
