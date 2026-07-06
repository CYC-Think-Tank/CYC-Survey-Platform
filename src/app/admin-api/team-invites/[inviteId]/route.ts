import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminRequest } from '@/lib/server/adminDomain';

type RouteContext = {
  params: Promise<{ inviteId: string }>;
};

function getSupabaseConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

// Revoking is a plain delete: RLS ("Team leaders can manage their team
// invites") already restricts this to invites for the team the caller leads.
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { inviteId } = await context.params;
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 });
  }

  const auth = await authenticateAdminRequest(request, supabaseUrl, anonKey);
  if (auth.error) return auth.error;

  const deleteRes = await fetch(
    `${supabaseUrl}/rest/v1/team_invites?id=eq.${encodeURIComponent(inviteId)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: anonKey,
        Authorization: request.headers.get('authorization') || '',
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    }
  );
  if (!deleteRes.ok) {
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
  const deleted = await deleteRes.json().catch(() => []);
  if (!Array.isArray(deleted) || deleted.length === 0) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
