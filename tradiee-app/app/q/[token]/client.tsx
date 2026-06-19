'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'

interface Props {
  quoteId: string
  token: string
  status: string
}

export function PublicQuoteActions({ quoteId, token, status }: Props) {
  const [loading, setLoading] = useState('')
  const [done, setDone] = useState('')

  async function respond(action: 'accept' | 'decline') {
    setLoading(action)
    const res = await fetch(`/api/quotes/${token}/${action}`, { method: 'POST' })
    if (res.ok) setDone(action)
    else setLoading('')
  }

  if (done === 'accept') return <div className="text-center py-6 text-green-600 font-semibold text-lg">✓ Thank you! Quote accepted. We&apos;ll be in touch shortly.</div>
  if (done === 'decline') return <div className="text-center py-6 text-gray-500">You&apos;ve declined this quote.</div>

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
      <p className="text-sm text-gray-600 sm:mr-4">Ready to proceed?</p>
      <Button loading={loading === 'accept'} onClick={() => respond('accept')} className="gap-2">
        <CheckCircle className="h-4 w-4" /> Accept quote
      </Button>
      <Button variant="outline" loading={loading === 'decline'} onClick={() => respond('decline')} className="gap-2">
        <XCircle className="h-4 w-4" /> Decline
      </Button>
    </div>
  )
}
