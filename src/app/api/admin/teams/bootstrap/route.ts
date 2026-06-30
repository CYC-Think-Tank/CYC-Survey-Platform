import { NextRequest, NextResponse } from 'next/server';

function getAllowedDomain() {
  return (
    process.env.ALLOWED_ADMIN_EMAIL_DOMAIN ||
    process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL_DOMAIN ||
    ''
  )
    .replace(/^@/, '')
    .toLowerCase();
}

async function getAuthenticatedAdmin(request: NextRequest, supabaseUrl: string, anonKey: string) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  });
  if (!userRes.ok) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await userRes.json();
  const allowedDomain = getAllowedDomain();
  const emailDomain = String(user.email || '')
    .toLowerCase()
    .split('@')[1];
  if (allowedDomain && emailDomain !== allowedDomain) {
    return { error: NextResponse.json({ error: 'Unauthorized domain' }, { status: 403 }) };
  }

  return { user };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await getAuthenticatedAdmin(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const teamName = String(body.name || '').trim();
  if (!teamName) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const existingTeamsRes = await fetch(`${supabaseUrl}/rest/v1/teams?select=id&limit=1`, {
    headers,
  });
  if (!existingTeamsRes.ok) {
    return NextResponse.json({ error: 'Failed to check existing teams' }, { status: 500 });
  }
  const existingTeams = await existingTeamsRes.json();
  if (existingTeams.length > 0) {
    return NextResponse.json(
      { error: 'A team already exists. Request access to an existing team.' },
      { status: 409 }
    );
  }

  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: auth.user.id, email: auth.user.email }),
  });
  if (!profileRes.ok) {
    const error = await profileRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: error.message || 'Failed to prepare user profile' },
      { status: 500 }
    );
  }

  const teamRes = await fetch(`${supabaseUrl}/rest/v1/teams?select=id,name`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ name: teamName, created_by: auth.user.id }),
  });
  if (!teamRes.ok) {
    const error = await teamRes.json().catch(() => ({}));
    return NextResponse.json({ error: error.message || 'Failed to create team' }, { status: 500 });
  }
  const [team] = await teamRes.json();

  const memberRes = await fetch(`${supabaseUrl}/rest/v1/team_members`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      team_id: team.id,
      user_id: auth.user.id,
      role: 'team_leader',
    }),
  });
  if (!memberRes.ok) {
    const error = await memberRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: error.message || 'Failed to create team membership' },
      { status: 500 }
    );
  }

  return NextResponse.json({ team, role: 'team_leader' });
}
