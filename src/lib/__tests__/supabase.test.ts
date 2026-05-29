import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url: string, key: string) => {
    if (!url || !key) throw new Error('Missing Supabase env vars');
    return {};
  })
}));

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('creates client with env vars', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    const { createClient } = await import('@supabase/supabase-js');
    vi.mocked(createClient).mockReturnValue({} as any);
    await import('../supabase');
    expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'test-anon-key');
  });

  it('throws when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(import('../supabase')).rejects.toThrow();
  });
});
