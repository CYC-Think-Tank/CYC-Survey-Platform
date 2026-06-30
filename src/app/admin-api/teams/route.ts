import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

function getConfig() {
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

export async function GET(request: NextRequest) {
  const { supabaseUrl, anonKey } = getConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const teamsRes = await fetch(`${supabaseUrl}/rest/v1/teams?select=id,name&order=name.asc`, {
    headers: userHeaders(request, anonKey),
  });
  if (!teamsRes.ok) {
    return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 });
  }
  return NextResponse.json(await teamsRes.json());
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, anonKey } = getConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  const createRes = await fetch(`${supabaseUrl}/rest/v1/rpc/create_team_for_current_user`, {
    method: 'POST',
    headers: userHeaders(request, anonKey),
    body: JSON.stringify({ p_name: name }),
  });
  const data = await createRes.json().catch(() => null);
  if (!createRes.ok) {
    return NextResponse.json(
      { error: data?.message || 'Failed to create team' },
      { status: createRes.status === 400 ? 400 : 409 }
    );
  }

  return NextResponse.json(Array.isArray(data) ? data[0] : data);
}
