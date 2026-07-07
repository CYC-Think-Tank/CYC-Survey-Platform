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

function inFilter(values: string[]) {
  return `in.(${values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(',')})`;
}

// Both queries use the caller's own JWT: "Invitees can read their own
// invites" RLS scopes the first to invites addressed to the caller's email,
// and teams are readable by any authenticated user (needed to browse/join).
export async function GET(request: NextRequest) {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const headers = userHeaders(request, anonKey);
  const invitesRes = await fetch(
    `${supabaseUrl}/rest/v1/team_invites?select=id,team_id,created_at&status=eq.pending&order=created_at.desc`,
    { headers }
  );
  if (!invitesRes.ok) {
    return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
  }
  const invites = await invitesRes.json();

  const teamIds = Array.from(
    new Set(invites.map((row: { team_id?: string }) => row.team_id).filter(Boolean))
  ) as string[];

  const teamsById = new Map<string, { name?: string | null }>();
  if (teamIds.length > 0) {
    const teamsRes = await fetch(
      `${supabaseUrl}/rest/v1/teams?select=id,name&id=${inFilter(teamIds)}`,
      { headers }
    );
    if (teamsRes.ok) {
      for (const row of await teamsRes.json()) {
        teamsById.set(row.id, row);
      }
    }
  }

  return NextResponse.json(
    invites.map((row: { id: string; team_id: string; created_at?: string }) => ({
      id: row.id,
      team_id: row.team_id,
      team_name: teamsById.get(row.team_id)?.name || null,
      created_at: row.created_at,
    }))
  );
}
