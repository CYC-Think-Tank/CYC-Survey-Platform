import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const code = 'j9DbMtk';
const email = 'elaineryu@gmail.com';

async function main() {
  // 1. Check if J9DbMtk is in share_links
  let { data: shareLinks } = await supabase.from('share_links').select('*').eq('code', code);

  let survey_id = null;

  if (!shareLinks || shareLinks.length === 0) {
    console.log(`Share link ${code} not found. We should find its survey_id from sessions.`);
    let { data: sess } = await supabase
      .from('response_sessions')
      .select('survey_id')
      .eq('referral_source', code)
      .limit(1);
    if (sess && sess.length > 0) {
      survey_id = sess[0].survey_id;
      console.log(`Inserting into share_links for survey ${survey_id}`);
      await supabase.from('share_links').insert({
        code: code,
        label: email,
        email: email,
        survey_id: survey_id,
      });
    } else {
      console.log(`No sessions found for ${code}`);
      process.exit(1);
    }
  } else {
    console.log(`Found share link, updating email to ${email}`);
    survey_id = shareLinks[0].survey_id;
    await supabase.from('share_links').update({ email: email, label: email }).eq('code', code);
  }

  // 2. Add raffle entries
  let { data: sessions } = await supabase
    .from('response_sessions')
    .select('id, survey_id, email')
    .eq('referral_source', code)
    .eq('is_completed', true);

  let added = 0;
  if (sessions) {
    for (const session of sessions) {
      if (session.email === email) continue; // self referral

      let { data: existing } = await supabase
        .from('raffle_entries')
        .select('id')
        .eq('session_id', session.id)
        .eq('email', email)
        .eq('is_referral', true);

      if (!existing || existing.length === 0) {
        await supabase.from('raffle_entries').insert({
          email: email,
          survey_id: session.survey_id,
          session_id: session.id,
          is_referral: true,
        });
        added += 1;
      }
    }
  }

  console.log(`Added ${added} missing raffle entries for ${email}.`);
}

main().catch(console.error);
