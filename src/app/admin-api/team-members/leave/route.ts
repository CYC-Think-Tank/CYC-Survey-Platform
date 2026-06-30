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

  const leaveRes = await fetch(`${supabaseUrl}/rest/v1/rpc/leave_current_team`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: request.headers.get('authorization') || '',
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const data = await leaveRes.json().catch(() => null);
  if (!leaveRes.ok) {
    return NextResponse.json(
      { error: data?.message || 'Failed to leave team' },
      { status: leaveRes.status === 400 ? 400 : 403 }
    );
  }

  return NextResponse.json({ success: true, team_id: data });
}
