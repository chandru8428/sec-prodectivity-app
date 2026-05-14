import { createClient } from '@supabase/supabase-js';

const url = 'https://jzvtcdamuddogcnqdxut.supabase.co';
const key = 'sb_publishable_MsS-CNs-LpqLoC890BOSEg_f0IpAMaN';
const supabase = createClient(url, key);

async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

getUsers();
