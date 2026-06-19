'use client'
import { useState } from 'react'

interface Props {
  token: string
  signupUrl: string
}

type ActionState = 'idle' | 'loading' | 'accepted' | 'declined' | 'error'

export function PublicInviteActions({ token, signupUrl }: Props) {
  const [state, setState] = useState<ActionState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleAction(action: 'accept' | 'decline') {
    setState('loading')
    setErrorMsg('')
    try {
      const endpoint = action === 'accept' ? '/api/invitations/accept' : '/api/invitations/decline'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setState('error')
        return
      }
      setState(action === 'accept' ? 'accepted' : 'declined')
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  if (state === 'accepted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-3">
        <div className="text-2xl">✓</div>
        <p className="font-semibold text-green-800">Invitation accepted!</p>
        <p className="text-sm text-green-700">
          We&apos;ve let them know you&apos;re on board. Consider signing up to IndustryForms to manage this job digitally.
        </p>
        <a
          href={signupUrl}
          className="inline-block mt-2 bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
        >
          Sign up to IndustryForms →
        </a>
      </div>
    )
  }

  if (state === 'declined') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center space-y-2">
        <p className="font-semibold text-gray-700">Invitation declined</p>
        <p className="text-sm text-gray-500">We&apos;ve let the contractor know.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">Respond to this invitation</h2>
      {state === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{errorMsg}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => handleAction('accept')}
          disabled={state === 'loading'}
          className="flex-1 bg-orange-500 text-white font-semibold py-2.5 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:pointer-events-none text-sm"
        >
          {state === 'loading' ? 'Processing...' : 'Accept'}
        </button>
        <button
          onClick={() => handleAction('decline')}
          disabled={state === 'loading'}
          className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:pointer-events-none text-sm"
        >
          Decline
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">
        Already on IndustryForms?{' '}
        <a href="/login" className="text-orange-500 hover:underline">Sign in</a>
        {' '}to import this job directly.
      </p>
    </div>
  )
}
