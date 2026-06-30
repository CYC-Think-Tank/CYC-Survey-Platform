import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

function serviceHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

function inFilter(values: string[]) {
  return `in.(${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(',')})`;
}

async function getLeaderTeamIds(supabaseUrl: string, serviceKey: string, userId: string) {
  const encodedUserId = encodeURIComponent(userId);
  const res = await fetch(
    `${supabaseUrl}/rest/v1/team_members?select=team_id&user_id=eq.${encodedUserId}&role=eq.team_leader`,
    { headers: serviceHeaders(serviceKey) }
  );
  if (!res.ok) {
    throw new Error('Failed to load team memberships');
  }
  const rows = await res.json();
  return rows.map((row: { team_id: string }) => row.team_id).filter(Boolean);
}

export async function GET(request: NextRequest) {
  const { supabaseUrl, serviceKey, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  let leaderTeamIds: string[];
  try {
    leaderTeamIds = await getLeaderTeamIds(supabaseUrl, serviceKey, auth.user.id);
  } catch {
    return NextResponse.json({ error: 'Failed to load team memberships' }, { status: 500 });
  }
  if (leaderTeamIds.length === 0) {
    return NextResponse.json({ error: 'Team leader permission required' }, { status: 403 });
  }

  const headers = serviceHeaders(serviceKey);
  const requestsRes = await fetch(
    `${supabaseUrl}/rest/v1/team_join_requests?select=id,team_id,user_id,status,requested_at&status=eq.pending&team_id=${inFilter(leaderTeamIds)}&order=requested_at.asc`,
    { headers }
  );
  if (!requestsRes.ok) {
    return NextResponse.json({ error: 'Failed to load team requests' }, { status: 500 });
  }
  const requests = await requestsRes.json();
  const userIds = Array.from(
    new Set(requests.map((row: { user_id?: string }) => row.user_id).filter(Boolean))
  ) as string[];
  const teamIds = Array.from(
    new Set(requests.map((row: { team_id?: string }) => row.team_id).filter(Boolean))
  ) as string[];

  const profilesById = new Map<string, { email?: string | null }>();
  if (userIds.length > 0) {
    const profilesRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,email&id=${inFilter(userIds)}`,
      { headers }
    );
    if (profilesRes.ok) {
      for (const row of await profilesRes.json()) {
        profilesById.set(row.id, row);
      }
    }
  }

  const teamsById = new Map<string, { name?: string | null }>();
  if (teamIds.length > 0) {
    const teamsRes = await fetch(
      `${supabaseUrl}/rest/v1/teams?select=id,name&id=${inFilter(teamIds)}`,
      {
        headers,
      }
    );
    if (teamsRes.ok) {
      for (const row of await teamsRes.json()) {
        teamsById.set(row.id, row);
      }
    }
  }

  return NextResponse.json(
    requests.map(
      (row: {
        id: string;
        team_id: string;
        user_id: string;
        status: string;
        requested_at?: string;
      }) => ({
        id: row.id,
        team_id: row.team_id,
        team_name: teamsById.get(row.team_id)?.name || null,
        user_id: row.user_id,
        user_email: profilesById.get(row.user_id)?.email || null,
        status: row.status,
        requested_at: row.requested_at,
      })
    )
  );
}

export async function POST(request: NextRequest) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const teamId = String(body.team_id || '').trim();
  if (!teamId) {
    return NextResponse.json({ error: 'Team is required' }, { status: 400 });
  }

  const requestRes = await fetch(`${supabaseUrl}/rest/v1/rpc/request_team_join`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: request.headers.get('authorization') || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_team_id: teamId }),
  });
  const data = await requestRes.json().catch(() => null);
  if (!requestRes.ok) {
    return NextResponse.json(
      { error: data?.message || 'Failed to request team access' },
      { status: requestRes.status === 400 ? 400 : 409 }
    );
  }

  return NextResponse.json({ success: true, request_id: data });
}
