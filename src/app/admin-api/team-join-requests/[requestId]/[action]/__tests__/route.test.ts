import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

function request() {
  return new NextRequest('http://localhost:3000/admin-api/team-join-requests/request-1/approve', {
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
  });
}

describe('resolve join request route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'leader-1', email: 'leader@thecyc.org' },
    });
  });

  it('approves through the atomic database function', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => null });

    const response = await POST(request(), {
      params: Promise.resolve({ requestId: 'request-1', action: 'approve' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/rpc/resolve_team_join_request',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_request_id: 'request-1', p_approve: true }),
      })
    );
  });

  it('returns forbidden when the database rejects a regular member', async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Team leader permission required' }),
    });

    const response = await POST(request(), {
      params: Promise.resolve({ requestId: 'request-1', action: 'approve' }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Team leader permission required' });
  });
});
