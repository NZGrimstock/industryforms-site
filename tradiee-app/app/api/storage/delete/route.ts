/**
 * POST /api/storage/delete
 * Deletes an object from the R2 public bucket. The key must live under the
 * authenticated user's company prefix.
 * Auth: Supabase session cookie (web) or `Authorization: Bearer` (mobile).
 */
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { resolveCompanyUser } from '@/lib/api-auth'
import { deletePublicObject } from '@/lib/r2'

export async function POST(req: Request) {
  const auth = await resolveCompanyUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await req.json() as { key: string }
  // Guard: key must belong to this company (keys look like <prefix>/<companyId>/...)
  if (!key || !key.includes(`/${auth.companyId}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deletePublicObject(key)
  return NextResponse.json({ success: true })
}
