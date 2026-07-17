import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const mocks = vi.hoisted(() => ({
  pathname: '/admin',
  dashboard: {
    role: 'admin' as 'admin' | 'student',
    basePath: '/admin',
    searchQuery: '',
    setSearchQuery: vi.fn(),
    openCreateModal: vi.fn(),
    adminEmail: 'admin@thecyc.org',
    handleLogout: vi.fn(),
    openAccountSettings: vi.fn(),
    isTeamLeader: false,
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ComponentProps<'img'>) => <img alt={alt} {...props} />,
}));

vi.mock('@/components/ThemeToggle', () => ({
  default: () => <button type="button">Toggle theme</button>,
}));

vi.mock('@/contexts/DashboardContext', () => ({
  useDashboard: () => mocks.dashboard,
}));

describe('DashboardShell raffle navigation', () => {
  beforeEach(() => {
    mocks.pathname = '/admin';
    mocks.dashboard.role = 'admin';
    mocks.dashboard.basePath = '/admin';
    mocks.dashboard.isTeamLeader = false;
  });

  it('restores the raffle section for administrators', () => {
    render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    expect(screen.getByRole('link', { name: 'Raffle' })).toHaveAttribute('href', '/admin/raffle');
  });

  it('shows the raffle section to team leaders but not ordinary members', () => {
    mocks.pathname = '/student';
    mocks.dashboard.role = 'student';
    mocks.dashboard.basePath = '/student';

    const { rerender } = render(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    expect(screen.queryByRole('link', { name: 'Raffle' })).not.toBeInTheDocument();

    mocks.dashboard.isTeamLeader = true;
    rerender(
      <DashboardShell>
        <div>Dashboard content</div>
      </DashboardShell>
    );

    expect(screen.getByRole('link', { name: 'Raffle' })).toHaveAttribute('href', '/student/raffle');
  });
});
