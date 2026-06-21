/**
 * POST /api/storage/signature
 * Stores a customer sign-off signature (base64 PNG from the mobile signature pad)
 * as a job photo in the R2 public bucket. Decoding happens server-side so the
 * client never has to deal with binary uploads or CORS.
 * Auth: Supabase session cookie (web) or `Authorization: Bearer` (mobile).
 */
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { resolveCompanyUser } from '@/lib/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { putObject, publicUrl, PUBLIC_BUCKET } from '@/lib/r2'

export async function POST(req: Request) {
  const auth = await resolveCompanyUser(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { jobId?: string; dataBase64?: string; caption?: string }
  if (!body.jobId || !body.dataBase64) {
    return NextResponse.json({ error: 'jobId and dataBase64 required' }, { status: 400 })
  }

  const svc = createServiceClient()
  // Make sure the job belongs to the caller's company before writing anything.
  const { data: job } = await svc.from('jobs').select('id').eq('id', body.jobId).eq('company_id', auth.companyId).single()
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const base64 = body.dataBase64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length === 0 || buffer.length > 2_000_000) {
    return NextResponse.json({ error: 'Invalid signature image' }, { status: 400 })
  }

  const key = `job-photos/${auth.companyId}/${body.jobId}/signature-${Date.now()}.png`
  await putObject(PUBLIC_BUCKET, key, buffer, 'image/png')

  await svc.from('job_photos').insert({
    job_id: body.jobId,
    company_id: auth.companyId,
    uploaded_by: auth.userId,
    storage_path: key,
    caption: body.caption ?? 'Customer sign-off',
    taken_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, key, publicUrl: publicUrl(key) })
}
