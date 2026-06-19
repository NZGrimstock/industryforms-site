import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ token: string; action: string }> }) {
  const { token, action } = await params
  if (!['accept', 'decline'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: quote } = await supabase.from('quotes').select('id, status').eq('public_token', token).single()

  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['draft', 'sent'].includes(quote.status)) return NextResponse.json({ error: 'Quote already responded to' }, { status: 409 })

  const updates = action === 'accept'
    ? { status: 'accepted', accepted_at: new Date().toISOString() }
    : { status: 'declined', declined_at: new Date().toISOString() }

  const { error } = await supabase.from('quotes').update(updates).eq('id', quote.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
