import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

function signupRequest(email: string) {
  return new NextRequest('http://localhost:3000/admin-api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
}

describe('admin signup route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.ALLOWED_ADMIN_EMAIL_DOMAIN = 'thecyc.org';
    mocks.createClient.mockReturnValue({ auth: { signUp: mocks.signUp } });
    mocks.signUp.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: null },
      error: null,
    });
  });

  it('rejects a misspelled admin domain without calling Supabase', async () => {
    const response = await POST(signupRequest('sylvia4@thecyc.or'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Use an email from thecyc.org.' });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('creates an account for the configured domain', async () => {
    const response = await POST(signupRequest('Person@TheCYC.org'));

    expect(response.status).toBe(200);
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'person@thecyc.org',
      password: 'password123',
    });
  });

  it('fails closed when the server domain is missing', async () => {
    delete process.env.ALLOWED_ADMIN_EMAIL_DOMAIN;

    const response = await POST(signupRequest('person@thecyc.org'));

    expect(response.status).toBe(500);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});
