import { NextRequest, NextResponse } from 'next/server';

type AuthenticatedAdmin = {
  user: { id: string; email: string };
  error?: never;
};

type AdminAuthError = {
  user?: never;
  error: NextResponse;
};

export function getServerAllowedAdminEmailDomain() {
  const domain = (process.env.ALLOWED_ADMIN_EMAIL_DOMAIN || '').trim();
  return domain.replace(/^@/, '').toLowerCase();
}

export function isServerAllowedAdminEmail(email?: string | null) {
  const allowedDomain = getServerAllowedAdminEmailDomain();
  if (!allowedDomain || !email) return false;
  return email.trim().toLowerCase().split('@')[1] === allowedDomain;
}

export async function authenticateAdminRequest(
  request: NextRequest,
  supabaseUrl: string,
  anonKey: string
): Promise<AuthenticatedAdmin | AdminAuthError> {
  if (!getServerAllowedAdminEmailDomain()) {
    return {
      error: NextResponse.json({ error: 'Admin email domain is not configured' }, { status: 500 }),
    };
  }

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
  if (!user.id || !isServerAllowedAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: 'Unauthorized domain' }, { status: 403 }) };
  }

  return { user: { id: user.id, email: user.email } };
}
