import { NextRequest, NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ requestId: string; action: string }>;
};

function getAllowedDomain() {
  return (
    process.env.ALLOWED_ADMIN_EMAIL_DOMAIN ||
    process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL_DOMAIN ||
    ''
  )
    .replace(/^@/, '')
    .toLowerCase();
}

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

export async function POST(request: NextRequest, context: RouteContext) {
  const { requestId, action } = await context.params;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Unknown request action' }, { status: 404 });
  }

  const { supabaseUrl, serviceKey, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await getAuthenticatedAdmin(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const headers = serviceHeaders(serviceKey);
  const encodedRequestId = encodeURIComponent(requestId);
  const requestRes = await fetch(
    `${supabaseUrl}/rest/v1/team_join_requests?select=id,team_id,user_id,status&id=eq.${encodedRequestId}&limit=1`,
    { headers }
  );
  if (!requestRes.ok) {
    return NextResponse.json({ error: 'Failed to load join request' }, { status: 500 });
  }
  const [joinRequest] = await requestRes.json();
  if (!joinRequest) {
    return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
  }

  const encodedUserId = encodeURIComponent(auth.user.id);
  const encodedTeamId = encodeURIComponent(joinRequest.team_id);
  const leaderRes = await fetch(
    `${supabaseUrl}/rest/v1/team_members?select=id&team_id=eq.${encodedTeamId}&user_id=eq.${encodedUserId}&role=eq.team_leader&limit=1`,
    { headers }
  );
  if (!leaderRes.ok) {
    return NextResponse.json({ error: 'Failed to check team leadership' }, { status: 500 });
  }
  const leaders = await leaderRes.json();
  if (leaders.length === 0) {
    return NextResponse.json({ error: 'Team leader permission required' }, { status: 403 });
  }

  if (action === 'approve') {
    const memberRes = await fetch(
      `${supabaseUrl}/rest/v1/team_members?on_conflict=team_id,user_id`,
      {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          team_id: joinRequest.team_id,
          user_id: joinRequest.user_id,
          role: 'team_member',
        }),
      }
    );
    if (!memberRes.ok) {
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/team_join_requests?id=eq.${encodedRequestId}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: auth.user.id,
      }),
    }
  );
  if (!updateRes.ok) {
    return NextResponse.json({ error: `Failed to ${action} request` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
