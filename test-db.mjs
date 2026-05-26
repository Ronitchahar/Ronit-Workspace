import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rulrtvghkblvejfpwqsj.supabase.co';
const supabaseKey = 'sb_publishable_7pOxpSii_O8ZPabHbNO5vw_69fygBpg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Users:", data);
  }
}

test();
