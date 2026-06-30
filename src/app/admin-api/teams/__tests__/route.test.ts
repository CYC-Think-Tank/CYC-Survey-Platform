import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

describe('create team route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'user-1', email: 'person@thecyc.org' },
    });
  });

  it('creates a team through the atomic database function', async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'team-1', name: 'Policy Team', role: 'team_leader' }],
    });
    const request = new NextRequest('http://localhost:3000/admin-api/teams', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Policy Team' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/rpc/create_team_for_current_user',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ p_name: 'Policy Team' }),
      })
    );
    expect(await response.json()).toEqual({
      id: 'team-1',
      name: 'Policy Team',
      role: 'team_leader',
    });
  });
});
