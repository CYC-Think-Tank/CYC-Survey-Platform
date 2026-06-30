import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getServerAllowedAdminEmailDomain,
  isServerAllowedAdminEmail,
} from '@/lib/server/adminDomain';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const allowedDomain = getServerAllowedAdminEmailDomain();

  if (!supabaseUrl || !anonKey || !allowedDomain) {
    return NextResponse.json({ error: 'Admin signup is not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (!isServerAllowedAdminEmail(email)) {
    return NextResponse.json({ error: `Use an email from ${allowedDomain}.` }, { status: 403 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await supabase.auth.signUp({ email, password });
  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: result.error.status || 400 }
    );
  }

  return NextResponse.json(result.data);
}
