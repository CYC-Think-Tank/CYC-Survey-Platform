import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const code = 'j9DbMtk';
const oldEmail = 'elaineryu@gmail.com';
const newEmail = 'elainerlyu@gmail.com';

async function main() {
  console.log(`Updating share_links to ${newEmail}...`);
  await supabase
    .from('share_links')
    .update({ email: newEmail, label: newEmail })
    .eq('code', code)
    .eq('email', oldEmail);

  console.log(`Updating raffle_entries to ${newEmail}...`);
  const { error } = await supabase
    .from('raffle_entries')
    .update({ email: newEmail })
    .eq('email', oldEmail);

  if (error) {
    console.error('Failed to update raffle entries:', error);
  } else {
    console.log(`Successfully updated all raffle entries for ${oldEmail} to ${newEmail}.`);
  }
}

main().catch(console.error);
