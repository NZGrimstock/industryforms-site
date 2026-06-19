import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const SERVER_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    SERVER_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component — middleware will handle session refresh
          }
        },
      },
    }
  )
}

export function createServiceClient() {
  return createSupabaseClient(
    SERVER_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
