import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLogin from '../page';

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.mockPush, refresh: mocks.mockRefresh }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
    },
  },
}));
vi.mock('@/lib/adminAuth', () => ({
  getAllowedAdminEmailDomain: () => 'thecyc.org',
  isAllowedAdminEmail: (email?: string) => email?.endsWith('@thecyc.org'),
}));

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    mocks.signUp.mockResolvedValue({ data: { session: { access_token: 'token' } } });
  });

  it('renders login form', () => {
    render(<AdminLogin />);
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@thecyc.org')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('blocks invalid email domains before calling Supabase', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Use an email from thecyc.org.')).toBeInTheDocument();
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it('redirects to admin after successful sign in', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@thecyc.org' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

    await waitFor(() => {
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'person@thecyc.org',
        password: 'password123',
      });
      expect(mocks.mockPush).toHaveBeenCalledWith('/admin');
    });
  });
});
