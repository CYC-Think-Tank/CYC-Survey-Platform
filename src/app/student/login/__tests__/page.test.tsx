import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLogin from '../page';

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  signInWithPassword: vi.fn(),
  setSession: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.mockPush, refresh: mocks.mockRefresh }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      setSession: mocks.setSession,
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
    vi.stubGlobal('fetch', mocks.fetch);
    mocks.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    mocks.setSession.mockResolvedValue({ error: null });
  });

  it('renders login form', () => {
    render(<AdminLogin />);
    expect(screen.getByText('Student Access')).toBeInTheDocument();
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

  it('redirects to student dashboard after successful sign in', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@thecyc.org' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);

    await waitFor(() => {
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'person@thecyc.org',
        password: 'password123',
      });
      expect(mocks.mockPush).toHaveBeenCalledWith('/student/teams');
    });
  });

  it('blocks a misspelled thecyc.org domain during signup', async () => {
    render(<AdminLogin />);
    fireEvent.click(screen.getByText('Need an account? Sign up'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sylvia4@thecyc.or' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign Up' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Use an email from thecyc.org.')).toBeInTheDocument();
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('sends valid signup through the server endpoint', async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ session: null, user: { id: 'user-1' } }),
    });
    render(<AdminLogin />);
    fireEvent.click(screen.getByText('Need an account? Sign up'));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@thecyc.org' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign Up' }).closest('form')!);

    await waitFor(() => {
      expect(mocks.fetch).toHaveBeenCalledWith('/admin-api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'person@thecyc.org', password: 'password123' }),
      });
      expect(
        screen.getByText('Check your email to confirm your account, then sign in.')
      ).toBeInTheDocument();
    });
  });
});
