import { POST } from '../route';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue(true),
    }),
  },
}));

describe('Notify New Survey API', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'http://test-supabase.com';
    process.env.SUPABASE_KEY = 'test-key';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.ALLOWED_ADMIN_EMAIL_DOMAIN = 'test.com';
    process.env.GMAIL_USER = 'test@test.com';
    process.env.GMAIL_APP_PASSWORD = 'test-app-password';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  });

  const createRequest = (body: any, token = 'valid-token') => {
    return new NextRequest('http://localhost:3000/api/admin/notify-new-survey', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  };

  it('rejects missing or invalid Supabase session', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects if missing env vars', async () => {
    delete process.env.SUPABASE_URL;
    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('rejects non-admin accounts with 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'student-id', email: 'student@test.com' }),
    });
    // profile is_admin lookup returns a non-admin
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([{ is_admin: false }]),
    });

    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 404 if no active surveys found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'admin-id', email: 'admin@test.com' }),
    });
    // profile is_admin lookup
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([{ is_admin: true }]),
    });
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    });

    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('sends emails only to users with remaining surveys', async () => {
    mockFetch
      // 0. auth user
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'admin-id', email: 'admin@test.com' }),
      })
      // 1. profile is_admin lookup
      .mockResolvedValueOnce({
        json: () => Promise.resolve([{ is_admin: true }]),
      })
      // 2. active surveys
      .mockResolvedValueOnce({
        json: () => Promise.resolve([{ id: 'survey1' }, { id: 'survey2' }]),
      })
      // 2. response sessions
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve([
            { email: 'user1@test.com', survey_id: 'survey1' },
            { email: 'user2@test.com', survey_id: 'survey1' },
            { email: 'user2@test.com', survey_id: 'survey2' }, // user2 has completed all
          ]),
      })
      // 3. existing share links
      .mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      })
      // 4. insert new share links
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(),
      });

    const req = createRequest({});
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(1); // Only user1 gets an email
  });
});
