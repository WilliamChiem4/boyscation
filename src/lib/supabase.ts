import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured: boolean = Boolean(URL && ANON_KEY)

let currentToken: string | null = null
let client: SupabaseClient | null = null

function build(): SupabaseClient {
  if (!URL || !ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see SUPABASE_SETUP.md), then restart the dev server.',
    )
  }
  return createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: currentToken ? { 'x-access-token': currentToken } : {},
    },
  })
}

export function setAccessToken(token: string | null): void {
  currentToken = token
  client = build()
}

export function getSupabase(): SupabaseClient {
  if (!client) client = build()
  return client
}

export function requireSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. See SUPABASE_SETUP.md.',
    )
  }
  return getSupabase()
}
