import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vvajcpsasshqydjtysjd.supabase.co'
const supabaseAnonKey = 'sb_publishable_2SU5EBF7yKgkQFXzF46SOw_fUJuTbs8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)