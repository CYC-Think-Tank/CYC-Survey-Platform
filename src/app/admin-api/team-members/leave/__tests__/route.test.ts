import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

describe('leave team route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'user-1', email: 'person@thecyc.org' },
    });
  });

  it('leaves through the guarded database function', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => 'team-1' });
    const request = new NextRequest('http://localhost:3000/admin-api/team-members/leave', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/rpc/leave_current_team',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns the database error when a leader attempts to leave', async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Transfer leadership before leaving the team' }),
    });
    const request = new NextRequest('http://localhost:3000/admin-api/team-members/leave', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Transfer leadership before leaving the team',
    });
  });
});
