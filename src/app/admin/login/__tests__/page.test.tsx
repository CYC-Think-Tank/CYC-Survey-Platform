import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminLogin from '../page';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, refresh: mockRefresh }) }));

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
      writable: true,
    });
  });

  it('renders login form', () => {
    render(<AdminLogin />);
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Access Dashboard' })).toBeInTheDocument();
  });

  it('shows error for incorrect password', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'wrong-password' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Access Dashboard' }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Incorrect password.')).toBeInTheDocument();
    });
  });

  it('redirects to admin on correct password', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'cycsurveyplatformadmin' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Access Dashboard' }).closest('form')!);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('cyc_admin_auth', 'true');
    });
  });

  it('shows loading state during submission', async () => {
    render(<AdminLogin />);
    fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Access Dashboard' }));
    await waitFor(() => {
      expect(screen.getByText('Verifying...')).toBeInTheDocument();
    });
  });
});
