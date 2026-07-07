import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE } from '../route';

const mocks = vi.hoisted(() => ({ authenticateAdminRequest: vi.fn(), fetch: vi.fn() }));

vi.mock('@/lib/server/adminDomain', () => ({
  authenticateAdminRequest: mocks.authenticateAdminRequest,
}));

function request() {
  return new NextRequest('http://localhost:3000/admin-api/team-invites/invite-1', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer token' },
  });
}

describe('revoke team invite route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mocks.fetch);
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    mocks.authenticateAdminRequest.mockResolvedValue({
      user: { id: 'leader-1', email: 'leader@thecyc.org' },
    });
  });

  it('deletes the invite via RLS-scoped delete', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => [{ id: 'invite-1' }] });

    const response = await DELETE(request(), { params: Promise.resolve({ inviteId: 'invite-1' }) });

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/rest/v1/team_invites?id=eq.invite-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('returns not found when RLS blocks the delete (not the invite owner)', async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => [] });

    const response = await DELETE(request(), { params: Promise.resolve({ inviteId: 'invite-1' }) });

    expect(response.status).toBe(404);
  });
});
