import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { password, surveyId } = await request.json();

    // Verify admin
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://cyc-survey-platform.vercel.app';

    if (!SUPABASE_URL || !SUPABASE_KEY || !GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
    }

    // Fetch survey details
    const surveyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/surveys?id=eq.${surveyId}&select=title`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const surveys = await surveyRes.json();
    if (!surveys || surveys.length === 0) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }
    const surveyTitle = surveys[0].title;

    // Fetch unique emails
    // A simple approach: fetch all response sessions
    // Using a large limit just in case
    const sessionsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/response_sessions?select=email&limit=10000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const sessions = await sessionsRes.json();

    // Extract unique emails
    const uniqueEmails = Array.from(
      new Set(sessions.map((s: { email: string | null }) => s.email).filter(Boolean))
    ) as string[];

    if (uniqueEmails.length === 0) {
      return NextResponse.json({ message: 'No users to notify', sent: 0 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    const subjectText = `New Survey Available: ${surveyTitle}`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#04377E,#0CB7C4);padding:32px 40px;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">CYC Survey Platform</h1>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#04377E;font-size:20px;margin:0 0 16px;">A new survey is waiting for you! ✨</h2>
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px;">
        We just launched a new survey: <strong>${surveyTitle}</strong>
      </p>
      
      <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Log in now to share your thoughts and earn another chance to win in our $100 raffle!
      </p>

      <div style="text-align:center;margin:28px 0;">
        <a href="${SITE_URL}" style="display:inline-block;background:linear-gradient(135deg,#F5C518,#f0b400);color:#04377E;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(245,197,24,0.4);">
          Take the Survey →
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

    let sentCount = 0;

    // Send in batches of 50 to avoid overloading Gmail SMTP
    const batchSize = 50;
    for (let i = 0; i < uniqueEmails.length; i += batchSize) {
      const batch = uniqueEmails.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (email) => {
          try {
            await transporter.sendMail({
              from: `CYC Surveys <${GMAIL_USER}>`,
              to: email,
              subject: subjectText,
              html,
            });
            sentCount++;
          } catch (err) {
            console.error(`Failed to send to ${email}:`, err);
          }
        })
      );

      // Delay between batches
      if (i + batchSize < uniqueEmails.length) {
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
