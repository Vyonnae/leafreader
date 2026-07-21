import { createClient } from "@supabase/supabase-js"

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceKey) {
    const error = new Error("Cloud RSS is not configured.")
    error.code = "SERVER_NOT_CONFIGURED"
    error.status = 503
    throw error
  }

  return { url, anonKey, serviceKey }
}

export function createAuthClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function createAdminClient() {
  const { url, serviceKey } = getSupabaseConfig()
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function createCallerClient(token) {
  const { url, anonKey } = getSupabaseConfig()
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
