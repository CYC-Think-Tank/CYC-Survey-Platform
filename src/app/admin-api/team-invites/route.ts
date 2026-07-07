import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

function userHeaders(request: NextRequest, anonKey: string) {
  return {
    apikey: anonKey,
    Authorization: request.headers.get('authorization') || '',
    'Content-Type': 'application/json',
  };
}

// RLS ("Team leaders can manage their team invites") already scopes this to
// invites for the team the caller leads, so no team_id filter is needed here.
export async function GET(request: NextRequest) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const invitesRes = await fetch(
    `${supabaseUrl}/rest/v1/team_invites?select=id,team_id,invited_email,status,created_at&status=eq.pending&order=created_at.desc`,
    { headers: userHeaders(request, anonKey) }
  );
  if (!invitesRes.ok) {
    return NextResponse.json({ error: 'Failed to load team invites' }, { status: 500 });
  }
  return NextResponse.json(await invitesRes.json());
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const inviteRes = await fetch(`${supabaseUrl}/rest/v1/rpc/invite_user_to_team`, {
    method: 'POST',
    headers: userHeaders(request, anonKey),
    body: JSON.stringify({ p_email: email }),
  });
  const data = await inviteRes.json().catch(() => null);
  if (!inviteRes.ok) {
    // PostgREST already maps the RPC's ERRCODEs to the right status (400
    // invalid email, 403 not a team leader, 409 already invited/on team).
    return NextResponse.json(
      { error: data?.message || 'Failed to send invite' },
      { status: inviteRes.status }
    );
  }

  return NextResponse.json({ success: true, invite_id: data });
}
