import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zdvowifsjuyolnsxasuq.supabase.co'
const supabaseKey = 'sb_publishable_m46nSkg25Kc4foFPqnFiMQ_hoUkniPi'

export const supabase = createClient(supabaseUrl, supabaseKey)