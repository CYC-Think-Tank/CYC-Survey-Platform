import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const SUPABASE_ANON_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || SUPABASE_KEY;
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cyc-survey-platform.vercel.app';
    const allowedDomain = (
      process.env.ALLOWED_ADMIN_EMAIL_DOMAIN ||
      process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAIL_DOMAIN ||
      ''
    )
      .replace(/^@/, '')
      .toLowerCase();

    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY ||
      !SUPABASE_ANON_KEY ||
      !GMAIL_USER ||
      !GMAIL_APP_PASSWORD
    ) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
    });
    if (!userRes.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await userRes.json();
    const emailDomain = String(user.email || '')
      .toLowerCase()
      .split('@')[1];
    if (allowedDomain && emailDomain !== allowedDomain) {
      return NextResponse.json({ error: 'Unauthorized domain' }, { status: 403 });
    }

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    // 1. Fetch all active surveys
    const activeSurveysRes = await fetch(
      `${SUPABASE_URL}/rest/v1/surveys?is_active=eq.true&select=id`,
      { headers }
    );
    const activeSurveys = await activeSurveysRes.json();
    if (!activeSurveys || activeSurveys.length === 0) {
      return NextResponse.json({ message: 'No active surveys found' }, { status: 404 });
    }
    const activeIds = new Set<string>(activeSurveys.map((s: { id: string }) => s.id));

    // 2. Fetch all response sessions to map user emails to completed survey IDs
    const sessionsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/response_sessions?select=email,survey_id&limit=50000`,
      { headers }
    );
    const sessions = await sessionsRes.json();

    const emailToCompleted = new Map<string, Set<string>>();
    for (const s of sessions) {
      if (!s.email) continue;
      if (!emailToCompleted.has(s.email)) emailToCompleted.set(s.email, new Set());
      emailToCompleted.get(s.email)!.add(s.survey_id);
    }

    // 3. Calculate remaining count per email and filter users
    const emailsToNotify: Array<{ email: string; remaining: number }> = [];
    for (const [email, completedSet] of emailToCompleted.entries()) {
      let remaining = 0;
      for (const id of activeIds) {
        if (!completedSet.has(id)) remaining++;
      }
      if (remaining > 0) {
        emailsToNotify.push({ email, remaining });
      }
    }

    if (emailsToNotify.length === 0) {
      return NextResponse.json({ message: 'No users have remaining surveys', sent: 0 });
    }

    // 4. Fetch existing global share links
    const linksRes = await fetch(
      `${SUPABASE_URL}/rest/v1/share_links?survey_id=is.null&select=email,code&limit=50000`,
      { headers }
    );
    const existingLinks = await linksRes.json();
    const emailToCode = new Map<string, string>();
    for (const l of existingLinks) {
      if (l.email) emailToCode.set(l.email, l.code);
    }

    // 5. Generate missing codes and prepare final user list
    const newLinksToInsert: Array<{ survey_id: null; code: string; label: string; email: string }> =
      [];
    const finalUsers: Array<{ email: string; remaining: number; code: string }> = [];

    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (const user of emailsToNotify) {
      let code = emailToCode.get(user.email);
      if (!code) {
        code = Array.from(
          { length: 7 },
          () => chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        newLinksToInsert.push({
          survey_id: null,
          code,
          label: 'User Referral',
          email: user.email,
        });
      }
      finalUsers.push({ ...user, code });
    }

    // Bulk insert new links if any
    if (newLinksToInsert.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/share_links`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(newLinksToInsert),
      });
    }

    // 6. Send emails
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    let sentCount = 0;
    const batchSize = 50;

    for (let i = 0; i < finalUsers.length; i += batchSize) {
      const batch = finalUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          const subjectText = `You have ${user.remaining} active ${user.remaining === 1 ? 'survey' : 'surveys'} waiting for you!`;
          const referralLink = `${SITE_URL}?ref=${user.code}`;

          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#ffffff;padding:24px 40px;text-align:center;border-bottom:2px solid #f4f6f8;">
      <img src="${SITE_URL}/logo.png" alt="Canadian Youth Champions Logo" style="height:60px;width:auto;display:inline-block;" />
    </div>
    <div style="background:linear-gradient(135deg,#04377E,#0CB7C4);padding:24px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;text-align:center;">CYC Survey Platform</h1>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#04377E;font-size:20px;margin:0 0 16px;">Make Your Voice Heard! ✨</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px;">
        You currently have <strong>${user.remaining}</strong> active ${user.remaining === 1 ? 'survey' : 'surveys'} waiting to be completed.
      </p>
      
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Log in now to share your thoughts and earn another chance to win in our $100 raffle!
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#F5C518,#f0b400);color:#04377E;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(245,197,24,0.4);">
          Take Your Surveys →
        </a>
      </div>

      <div style="background:#e6f8f9;border:1px solid #0CB7C4;border-radius:12px;padding:20px;margin-top:32px;text-align:center;">
        <h3 style="color:#04377E;font-size:16px;margin:0 0 8px;">🎁 Boost Your Chances!</h3>
        <p style="color:#0CA7A1;font-size:14px;font-weight:bold;margin:0 0 12px;">1 Referral = +1 Raffle Entry</p>
        <p style="color:#555;font-size:13px;line-height:1.5;margin:0 0 16px;">
          Share your unique link with friends. For every person who completes a survey using your link, you get an extra entry to win $100!
        </p>
        <div style="background:#fff;border:1px dashed #0CA7A1;border-radius:8px;padding:12px;font-family:monospace;font-size:14px;color:#04377E;">
          ${referralLink}
        </div>
      </div>

      <p style="color:#999;font-size:12px;text-align:center;margin:32px 0 0;">
        Your voice matters. Thank you for helping empower Canadian youth.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 40px;text-align:center;">
      <p style="color:#bbb;font-size:11px;margin:0;">Canadian Youth Champions &bull; <a href="${SITE_URL}" style="color:#0CB7C4;">thecyc.org</a></p>
    </div>
  </div>
</body></html>`;

          try {
            await transporter.sendMail({
              from: `CYC Surveys <${GMAIL_USER}>`,
              to: user.email,
              subject: subjectText,
              html,
            });
            sentCount++;
          } catch (err) {
            console.error(`Failed to send to ${user.email}:`, err);
          }
        })
      );

      // Delay between batches
      if (i + batchSize < finalUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ message: `Blast sent to ${sentCount} users`, sent: sentCount });
  } catch (error: unknown) {
    console.error('Notify users error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
