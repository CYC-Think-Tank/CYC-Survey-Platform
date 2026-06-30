import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

type RouteContext = {
  params: Promise<{ requestId: string; action: string }>;
};

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { requestId, action } = await context.params;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Unknown request action' }, { status: 404 });
  }

  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const resolveRes = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_team_join_request`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: request.headers.get('authorization') || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_request_id: requestId, p_approve: action === 'approve' }),
  });
  const data = await resolveRes.json().catch(() => null);
  if (!resolveRes.ok) {
    return NextResponse.json(
      { error: data?.message || `Failed to ${action} request` },
      { status: resolveRes.status === 400 ? 400 : 403 }
    );
  }

  return NextResponse.json({ success: true });
}
