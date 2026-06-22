import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rngahpybhgdqabbkldrr.supabase.co'
const supabaseKey = 'sb_publishable_IzGAUw3EEdYfsPVT4VZOtA_PH3cVJmy'

export const supabase = createClient(supabaseUrl, supabaseKey)
