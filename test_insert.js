const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdvowifsjuyolnsxasuq.supabase.co';
const supabaseKey = 'sb_publishable_m46nSkg25Kc4foFPqnFiMQ_hoUkniPi';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelectMobile() {
  const { data, error } = await supabase.from('photo_uploads').select('*').eq('mobile', '123').limit(1);
  console.log(JSON.stringify({ data, error }, null, 2));
  process.exit(0);
}

testSelectMobile().catch(console.error);
