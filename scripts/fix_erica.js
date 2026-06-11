import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const code = 'v8fcUa2';
const newEmail = 'andrewqiu91@gmail.com';

async function main() {
  console.log(`Checking current share_links for code ${code}...`);
  const { data: links } = await supabase.from('share_links').select('*').eq('code', code);
  console.log('Current links:', links);

  if (links && links.length > 0) {
    const oldEmail = links[0].email;
    if (oldEmail !== newEmail) {
      console.log(`Updating share_links from ${oldEmail} to ${newEmail}...`);
      await supabase
        .from('share_links')
        .update({ email: newEmail, label: newEmail })
        .eq('code', code)
        .eq('email', oldEmail);

      console.log(`Updating raffle_entries for referrals...`);
      const { error } = await supabase
        .from('raffle_entries')
        .update({ email: newEmail })
        .eq('email', oldEmail)
        .eq('is_referral', true);

      if (error) {
        console.error('Failed to update raffle entries:', error);
      } else {
        console.log('Updated raffle entries successfully.');
      }
    } else {
      console.log('Share link is already assigned to the correct email.');
    }
  } else {
    console.log(`No share link found for code ${code}. Creating one...`);
    await supabase.from('share_links').insert({ code, email: newEmail, label: newEmail });
  }

  // Now let's check response_sessions that have this referral source
  console.log(`Checking response_sessions for referral_source ${code}...`);
  const { data: sessions } = await supabase
    .from('response_sessions')
    .select('*')
    .eq('referral_source', code);

  console.log(`Found ${sessions ? sessions.length : 0} sessions with this referral code.`);

  // For each session, ensure Erica has a raffle entry
  if (sessions && sessions.length > 0) {
    for (const session of sessions) {
      if (!session.is_completed) continue;

      // Check if Erica already has an entry for this session
      const { data: existingEntries } = await supabase
        .from('raffle_entries')
        .select('*')
        .eq('session_id', session.id)
        .eq('email', newEmail)
        .eq('is_referral', true);

      if (!existingEntries || existingEntries.length === 0) {
        if (session.email !== newEmail) {
          console.log(`Adding missing raffle entry for session ${session.id}...`);
          await supabase.from('raffle_entries').insert({
            email: newEmail,
            survey_id: session.survey_id,
            session_id: session.id,
            is_referral: true,
          });
        }
      }
    }
  }
  console.log('Done.');
}

main().catch(console.error);
