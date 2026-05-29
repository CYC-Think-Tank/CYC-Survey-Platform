import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
    }),
  },
}));

describe('Cron Reminders API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    process.env.NODE_ENV = 'production';
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-pass';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_KEY = 'test-key';
  });

  it('returns 401 without authorization header', async () => {
    const request = new Request('http://localhost:3000/api/cron/reminders');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 with incorrect secret', async () => {
    const request = new Request('http://localhost:3000/api/cron/reminders', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('returns 500 when env vars are missing', async () => {
    delete process.env.GMAIL_USER;
    const request = new Request('http://localhost:3000/api/cron/reminders', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const response = await GET(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Missing env vars');
  });

  it('returns 200 with correct authorization in non-production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-pass';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_KEY = 'test-key';
    global.fetch = vi.fn().mockResolvedValue({ json: async () => [] } as Response);
    const request = new Request('http://localhost:3000/api/cron/reminders');
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
