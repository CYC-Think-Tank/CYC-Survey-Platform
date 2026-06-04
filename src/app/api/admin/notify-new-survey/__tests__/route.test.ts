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
    process.env.ADMIN_PASSWORD = 'test-password';
    process.env.SUPABASE_URL = 'http://test-supabase.com';
    process.env.SUPABASE_KEY = 'test-key';
    process.env.GMAIL_USER = 'test@test.com';
    process.env.GMAIL_APP_PASSWORD = 'test-app-password';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/admin/notify-new-survey', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  it('rejects invalid password', async () => {
    const req = createRequest({ password: 'wrong-password', surveyId: '123' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects if missing env vars', async () => {
    delete process.env.SUPABASE_URL;
    const req = createRequest({ password: 'test-password', surveyId: '123' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 404 if survey not found', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    });

    const req = createRequest({ password: 'test-password', surveyId: '123' });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('sends emails to unique users', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve([{ title: 'Test Survey' }]),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve([
            { email: 'user1@test.com' },
            { email: 'user1@test.com' }, // Duplicate
            { email: 'user2@test.com' },
            { email: null }, // Null email
          ]),
      });

    const req = createRequest({ password: 'test-password', surveyId: '123' });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(2);
  });
});
