import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Resolve the authenticated user + company for an API route, accepting either:
 *  - a Supabase session cookie (web), or
 *  - an `Authorization: Bearer <access_token>` header (mobile).
 * Returns null if unauthenticated or the user has no company.
 */
export async function resolveCompanyUser(req: Request): Promise<{ userId: string; companyId: string } | null> {
  const authHeader = req.headers.get('authorization')
  let userId: string | null = null

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7)
    const svc = createServiceClient()
    const { data } = await svc.auth.getUser(token)
    userId = data.user?.id ?? null
  } else {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    userId = data.user?.id ?? null
  }

  if (!userId) return null

  const svc = createServiceClient()
  const { data: profile } = await svc.from('profiles').select('company_id').eq('id', userId).single()
  if (!profile?.company_id) return null

  return { userId, companyId: profile.company_id }
}
