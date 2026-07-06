import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

type RouteContext = {
  params: Promise<{ inviteId: string; action: string }>;
};

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { inviteId, action } = await context.params;
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Unknown invite action' }, { status: 404 });
  }

  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const rpcName = action === 'accept' ? 'accept_team_invite' : 'decline_team_invite';
  const resolveRes = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: request.headers.get('authorization') || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_invite_id: inviteId }),
  });
  const data = await resolveRes.json().catch(() => null);
  if (!resolveRes.ok) {
    return NextResponse.json(
      { error: data?.message || `Failed to ${action} invite` },
      { status: resolveRes.status }
    );
  }

  return NextResponse.json({ success: true, team_id: action === 'accept' ? data : undefined });
}
