/**
 * POST /api/storage/upload-url
 * Returns a presigned PUT URL so the browser/mobile can upload directly to the
 * R2 public bucket. The object key is constructed server-side from the
 * authenticated user's company, so a client can never write outside its own space.
 * Auth: Supabase session cookie (web) or `Authorization: Bearer` (mobile).
 */
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveCompanyUser } from '@/lib/api-auth'
import { presignedUpload, publicUrl } from '@/lib/r2'

const bodySchema = z.object({
  kind: z.enum(['job-photo', 'company-logo']),
  jobId: z.string().uuid().optional(),
  ext: z.string().max(10).optional(),
  contentType: z.string().max(100).optional(),
})

export async function POST(req: Request) {
  const auth = await resolveCompanyUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
  const body = parsed.data
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
