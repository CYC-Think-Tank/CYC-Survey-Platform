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

export async function GET(request: NextRequest) {
  const { supabaseUrl, serviceKey, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const headers = serviceHeaders(serviceKey);
  const encodedUserId = encodeURIComponent(auth.user.id);
  const membershipRes = await fetch(
    `${supabaseUrl}/rest/v1/team_members?select=team_id&user_id=eq.${encodedUserId}`,
    { headers }
  );
  if (!membershipRes.ok) {
    return NextResponse.json({ error: 'Failed to load team memberships' }, { status: 500 });
  }

  const ownMemberships = await membershipRes.json();
  const teamIds = Array.from(
    new Set(ownMemberships.map((row: { team_id?: string }) => row.team_id).filter(Boolean))
  ) as string[];
  if (teamIds.length === 0) {
    return NextResponse.json([]);
  }

  const membersRes = await fetch(
    `${supabaseUrl}/rest/v1/team_members?select=id,team_id,user_id,role,created_at&team_id=${inFilter(teamIds)}&order=created_at.asc`,
    { headers }
  );
  if (!membersRes.ok) {
    return NextResponse.json({ error: 'Failed to load team members' }, { status: 500 });
  }

  const members = await membersRes.json();
  const userIds = Array.from(
    new Set(members.map((row: { user_id?: string }) => row.user_id).filter(Boolean))
  ) as string[];

  const profilesById = new Map<string, { email?: string | null; full_name?: string | null }>();
  if (userIds.length > 0) {
    const profilesRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id,email,full_name&id=${inFilter(userIds)}`,
      { headers }
    );
    if (profilesRes.ok) {
      for (const row of await profilesRes.json()) {
        profilesById.set(row.id, row);
      }
    }
  }

  const teamsById = new Map<string, { name?: string | null }>();
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

  return NextResponse.json(
    members.map(
      (row: {
        id: string;
        team_id: string;
        user_id: string;
        role: 'team_leader' | 'team_member';
        created_at?: string;
      }) => ({
        id: row.id,
        team_id: row.team_id,
        team_name: teamsById.get(row.team_id)?.name || null,
        user_id: row.user_id,
        user_email: profilesById.get(row.user_id)?.email || null,
        full_name: profilesById.get(row.user_id)?.full_name || null,
        role: row.role,
        created_at: row.created_at,
      })
    )
  );
}
