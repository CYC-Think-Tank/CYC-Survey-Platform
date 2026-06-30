import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }
  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;
  const authHeader = request.headers.get('authorization') || '';

  const body = await request.json().catch(() => ({}));
  const teamId = String(body.team_id || '').trim();
  const newLeaderUserId = String(body.new_leader_user_id || '').trim();
  if (!teamId || !newLeaderUserId) {
    return NextResponse.json({ error: 'Team and new leader are required' }, { status: 400 });
  }

  const transferRes = await fetch(`${supabaseUrl}/rest/v1/rpc/transfer_team_leadership`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_team_id: teamId,
      p_new_leader_user_id: newLeaderUserId,
    }),
  });
  if (!transferRes.ok) {
    const error = await transferRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: error.message || 'Failed to transfer team leadership' },
      { status: transferRes.status === 400 ? 400 : 403 }
    );
  }

  return NextResponse.json({ success: true });
}
