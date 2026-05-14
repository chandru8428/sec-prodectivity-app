import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://jzvtcdamuddogcnqdxut.supabase.co', 'sb_publishable_MsS-CNs-LpqLoC890BOSEg_f0IpAMaN');

async function run() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}
run();
