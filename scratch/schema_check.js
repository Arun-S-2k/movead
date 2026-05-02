const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zdvowifsjuyolnsxasuq.supabase.co';
const supabaseKey = 'sb_publishable_m46nSkg25Kc4foFPqnFiMQ_hoUkniPi';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('campaigns').select('*').limit(1);
  console.log('campaigns', data, error);
  const { data: d2, error: e2 } = await supabase.from('campaign_assignments').select('*').limit(1);
  console.log('campaign_assignments', d2, e2);
  const { data: d3, error: e3 } = await supabase.from('driver_campaigns').select('*').limit(1);
  console.log('driver_campaigns', d3, e3);
}
check();
