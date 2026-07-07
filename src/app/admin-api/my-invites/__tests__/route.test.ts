import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

describe('my invites route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'invitee-1', email: 'invitee@thecyc.org' },
    });
  });

  it("resolves team names for the caller's own pending invites", async () => {
    mocks.fetch.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/rest/v1/team_invites')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: 'invite-1', team_id: 'team-1', created_at: '2026-07-01T00:00:00Z' },
          ],
        });
      }
      if (url.includes('/rest/v1/teams')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ id: 'team-1', name: 'CYC Team' }],
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    const request = new NextRequest('http://localhost:3000/admin-api/my-invites', {
      headers: { Authorization: 'Bearer token' },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: 'invite-1',
        team_id: 'team-1',
        team_name: 'CYC Team',
        created_at: '2026-07-01T00:00:00Z',
      },
    ]);
  });

  it('returns an empty list when there are no pending invites', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => [] });
    const request = new NextRequest('http://localhost:3000/admin-api/my-invites', {
      headers: { Authorization: 'Bearer token' },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
