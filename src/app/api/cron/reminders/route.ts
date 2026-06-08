import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface IncompleteSession {
  id: string;
  email: string;
  survey_id: string;
  current_step: number;
}

interface ActiveSurvey {
  id: string;
  title: string;
}

interface CompletedSession {
  id?: string;
  email: string;
  survey_id: string;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cyc-survey-platform.vercel.app';

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const sessionsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/response_sessions?is_completed=eq.false&reminder_sent=eq.false&started_at=lt.${cutoff}&select=id,email,survey_id,current_step`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const incompleteSessions: IncompleteSession[] = (await sessionsRes.json()) || [];

    // Also fetch completed sessions that haven't sent the "unstarted surveys" reminder yet
    // Note: If the column unstarted_reminder_sent doesn't exist yet, this will fail gracefully
    const unstartedRes = await fetch(
      `${SUPABASE_URL}/rest/v1/response_sessions?is_completed=eq.true&unstarted_reminder_sent=eq.false&updated_at=lt.${cutoff}&select=id,email,survey_id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    let completedReminders: CompletedSession[] = [];
    if (unstartedRes.ok) {
      completedReminders = await unstartedRes.json();
    }

    if (!incompleteSessions.length && !completedReminders.length) {
      return NextResponse.json({ message: 'No reminders needed', sent: 0 });
    }

    const surveysRes = await fetch(
      `${SUPABASE_URL}/rest/v1/surveys?is_active=eq.true&select=id,title`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const activeSurveys: ActiveSurvey[] = await surveysRes.json();

    const completedRes = await fetch(
      `${SUPABASE_URL}/rest/v1/response_sessions?is_completed=eq.true&select=email,survey_id`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    const completedSessions: CompletedSession[] = await completedRes.json();

    const completedMap: Record<string, Set<string>> = {};
    for (const s of completedSessions || []) {
      if (!completedMap[s.email]) completedMap[s.email] = new Set();
      completedMap[s.email].add(s.survey_id);
    }

    // All users who need some kind of reminder
    const allEmailsToRemind = new Set([
      ...incompleteSessions.map((s) => s.email),
      ...completedReminders.map((s) => s.email),
    ]);

    const byEmailIncomplete: Record<string, typeof incompleteSessions> = {};
    for (const s of incompleteSessions) {
      if (!byEmailIncomplete[s.email]) byEmailIncomplete[s.email] = [];
      byEmailIncomplete[s.email].push(s);
    }

    const byEmailCompletedReminders: Record<string, typeof completedReminders> = {};
    for (const s of completedReminders) {
      if (!byEmailCompletedReminders[s.email]) byEmailCompletedReminders[s.email] = [];
      byEmailCompletedReminders[s.email].push(s);
    }

    let sentCount = 0;

    for (const email of Array.from(allEmailsToRemind)) {
      const incompleteForEmail = byEmailIncomplete[email] || [];
      const completedRemindersForEmail = byEmailCompletedReminders[email] || [];

      const completed = completedMap[email] || new Set();

      // remainingSurveys: all active surveys that aren't completed yet
      const remainingSurveys = activeSurveys.filter((s) => !completed.has(s.id));

      const unfinishedCount = incompleteForEmail.length;

      // Set of unfinished survey IDs to identify which remaining ones haven't been started at all
      const unfinishedSurveyIds = new Set(incompleteForEmail.map((s) => s.survey_id));
      const unstartedCount = remainingSurveys.filter((s) => !unfinishedSurveyIds.has(s.id)).length;

      // If they only had a completed reminder triggered, but no unstarted surveys left, skip!
      if (unfinishedCount === 0 && unstartedCount === 0) {
        // Still need to mark those completed sessions as "reminded" so we don't fetch them again
        for (const s of completedRemindersForEmail) {
          if (!s.id) continue;
          await fetch(`${SUPABASE_URL}/rest/v1/response_sessions?id=eq.${s.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ unstarted_reminder_sent: true }),
          });
        }
        continue;
      }

      let subjectText = '';
      let headline = '';
      let introText = '';

      if (unfinishedCount > 0) {
        headline = "You're almost there! 🎯";
        introText =
          "We noticed you didn't get a chance to finish some of your active surveys. Your responses have been saved — pick up right where you left off!";
        subjectText =
          unstartedCount > 0
            ? `You have ${unfinishedCount} unfinished and ${unstartedCount} new survey${unstartedCount > 1 ? 's' : ''} waiting`
            : `You have ${unfinishedCount} unfinished survey${unfinishedCount > 1 ? 's' : ''} waiting`;
      } else {
        headline = 'New surveys await! ✨';
        introText =
          'Thanks for completing your previous survey! We have more active surveys waiting for your input.';
        subjectText = `You have ${unstartedCount} active survey${unstartedCount > 1 ? 's' : ''} waiting for you`;
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#04377E,#0CB7C4);padding:32px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">CYC Survey Platform</h1>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#04377E;font-size:20px;margin:0 0 16px;">${headline}</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px;">
        ${introText}
      </p>
      
      <div style="background:#f0fdf4;border-left:4px solid #0CB7C4;padding:16px 20px;border-radius:8px;margin:0 0 24px;">
        <p style="color:#04377E;font-size:15px;margin:0 0 8px;font-weight:700;">📋 Remaining Surveys:</p>
        <ul style="color:#04377E;font-size:14px;margin:0;padding-left:20px;line-height:1.6;">
          ${unfinishedCount > 0 ? `<li><strong>${unfinishedCount}</strong> unfinished survey${unfinishedCount > 1 ? 's' : ''}</li>` : ''}
          ${unstartedCount > 0 ? `<li><strong>${unstartedCount}</strong> new survey${unstartedCount > 1 ? 's' : ''} waiting to be started</li>` : ''}
        </ul>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#F5C518,#f0b400);color:#04377E;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(245,197,24,0.4);">
          Continue Your Surveys →
        </a>
      </div>
      <p style="color:#999;font-size:12px;text-align:center;margin:24px 0 0;">
        Your voice matters. Thank you for helping empower Canadian youth.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 40px;text-align:center;">
      <p style="color:#bbb;font-size:11px;margin:0;">Canadian Youth Cabinet &bull; <a href="${SITE_URL}" style="color:#0CB7C4;">thecyc.org</a></p>
    </div>
  </div>
</body></html>`;

      try {
        await transporter.sendMail({
          from: `CYC Surveys <${GMAIL_USER}>`,
          to: email,
          subject: subjectText,
          html,
        });

        sentCount++;

        // Mark incomplete sessions as reminder_sent
        for (const s of incompleteForEmail) {
          await fetch(`${SUPABASE_URL}/rest/v1/response_sessions?id=eq.${s.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ reminder_sent: true }),
          });
        }

        // Mark completed sessions as unstarted_reminder_sent
        for (const s of completedRemindersForEmail) {
          if (!s.id) continue;
          await fetch(`${SUPABASE_URL}/rest/v1/response_sessions?id=eq.${s.id}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ unstarted_reminder_sent: true }),
          });
        }
      } catch (emailErr) {
        console.error(`Failed to send to ${email}:`, emailErr);
      }
    }

    return NextResponse.json({ message: `Sent ${sentCount} reminder emails`, sent: sentCount });
  } catch (error) {
    console.error('Cron error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
