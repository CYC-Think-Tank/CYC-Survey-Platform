import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

function request() {
  return new NextRequest('http://localhost:3000/admin-api/team-invites/invite-1/accept', {
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
  });
}

describe('resolve team invite route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'invitee-1', email: 'invitee@thecyc.org' },
    });
  });

  it('accepts through the atomic database function', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => 'team-1' });

    const response = await POST(request(), {
      params: Promise.resolve({ inviteId: 'invite-1', action: 'accept' }),
    });

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/rpc/accept_team_invite',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_invite_id: 'invite-1' }),
      })
    );
    expect(await response.json()).toEqual({ success: true, team_id: 'team-1' });
  });

  it('declines through the atomic database function', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => null });

    const response = await POST(
      new NextRequest('http://localhost:3000/admin-api/team-invites/invite-1/decline', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      }),
      { params: Promise.resolve({ inviteId: 'invite-1', action: 'decline' }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/rpc/decline_team_invite',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('rejects accepting an invite addressed to someone else', async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'This invite is not addressed to you' }),
    });

    const response = await POST(request(), {
      params: Promise.resolve({ inviteId: 'invite-1', action: 'accept' }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'This invite is not addressed to you' });
  });

  it('rejects an unknown action', async () => {
    const response = await POST(request(), {
      params: Promise.resolve({ inviteId: 'invite-1', action: 'delete' }),
    });

    expect(response.status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
