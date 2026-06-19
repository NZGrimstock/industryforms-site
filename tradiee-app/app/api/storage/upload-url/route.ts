/**
 * POST /api/storage/upload-url
 * Returns a presigned PUT URL so the browser/mobile can upload directly to the
 * R2 public bucket. The object key is constructed server-side from the
 * authenticated user's company, so a client can never write outside its own space.
 * Auth: Supabase session cookie (web) or `Authorization: Bearer` (mobile).
 */
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { resolveCompanyUser } from '@/lib/api-auth'
import { presignedUpload, publicUrl } from '@/lib/r2'

export async function POST(req: Request) {
  const auth = await resolveCompanyUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { kind: 'job-photo' | 'company-logo'; jobId?: string; ext?: string; contentType?: string }
  const ext = (body.ext ?? 'bin').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin'
  const contentType = body.contentType ?? 'application/octet-stream'
  const company = auth.companyId

  let key: string
  if (body.kind === 'company-logo') {
    key = `company-logos/${company}/logo.${ext}`
  } else if (body.kind === 'job-photo') {
    if (!body.jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
    const rand = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    key = `job-photos/${company}/${body.jobId}/${rand}.${ext}`
  } else {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  }

  const url = await presignedUpload(key, contentType)
  return NextResponse.json({ url, key, publicUrl: publicUrl(key) })
}
