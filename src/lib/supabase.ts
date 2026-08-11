import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Single shared client for the whole app. The anon key is public by design —
// it identifies the project, it does not authorize anything. Access control
// lives in the security-definer functions in supabase/schema.sql.
//
// Falls back to placeholder values when env vars are missing so the module can
// still be imported and the UI can render its "not configured" notice instead
// of crashing at import time.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      // This project has no Supabase Auth; skip the session machinery entirely.
      persistSession: false,
      autoRefreshToken: false,
    },
  },
)
