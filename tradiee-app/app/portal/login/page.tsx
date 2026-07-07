'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'

export default function CustomerPortalLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/portal/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))

    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Could not request a portal link.')
      return
    }

    setSent(true)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm font-medium text-orange-600 hover:text-orange-700">
          IndustryForms
        </Link>

        <div className="mt-6 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Customer portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we&apos;ll send a secure link to your jobs and invoices.
          </p>

          {sent ? (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-800">Check your inbox</p>
              <p className="mt-1 text-sm text-green-700">
                If that email matches a customer record, a portal link will arrive shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  autoComplete="email"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send portal link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
