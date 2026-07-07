import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

describe('team invites route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'leader-1', email: 'leader@thecyc.org' },
    });
  });

  it('lists pending invites for the team the caller leads', async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'invite-1', team_id: 'team-1', invited_email: 'new@thecyc.org', status: 'pending' },
      ],
    });
    const request = new NextRequest('http://localhost:3000/admin-api/team-invites', {
      headers: { Authorization: 'Bearer token' },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/team_invites?select='),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      })
    );
    expect(await response.json()).toEqual([
      { id: 'invite-1', team_id: 'team-1', invited_email: 'new@thecyc.org', status: 'pending' },
    ]);
  });

  it('sends an invite through the atomic database function', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => 'invite-1' });
    const request = new NextRequest('http://localhost:3000/admin-api/team-invites', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'New@TheCYC.org' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/rpc/invite_user_to_team',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_email: 'New@TheCYC.org' }),
      })
    );
    expect(await response.json()).toEqual({ success: true, invite_id: 'invite-1' });
  });

  it('rejects invite creation from a non-leader', async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Team leader permission required' }),
    });
    const request = new NextRequest('http://localhost:3000/admin-api/team-invites', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@thecyc.org' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Team leader permission required' });
  });

  it('requires an email', async () => {
    const request = new NextRequest('http://localhost:3000/admin-api/team-invites', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '  ' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
