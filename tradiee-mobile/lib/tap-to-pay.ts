// Tap to Pay client wiring for the mobile app.
//
// Codex build audit marker (2026-07-07): Stripe Terminal RN SDK wiring landed
// here and in app/pay-now.tsx. iOS production still requires Apple's
// com.apple.developer.proximity-reader entitlement outside the codebase.
//
// Backend marks invoice paid + fires review-request via the existing
// payment_intent.succeeded webhook after the SDK confirms the PaymentIntent.

import { supabase } from '@/lib/supabase'

export const TAP_TO_PAY_READY = true
export const STRIPE_TERMINAL_LOCATION_ID = process.env.EXPO_PUBLIC_STRIPE_TERMINAL_LOCATION_ID ?? ''

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sign in again before taking a payment.')
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function fetchConnectionToken(apiBase: string): Promise<string> {
  const res = await fetch(`${apiBase}/api/stripe/terminal/connection-token`, {
    method: 'POST',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Connection token failed')
  }
  const { secret } = await res.json()
  return secret as string
}

export async function fetchTerminalPaymentIntent(apiBase: string, invoiceId: string, amount?: number) {
  const res = await fetch(`${apiBase}/api/stripe/terminal/payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ invoice_id: invoiceId, amount }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'PaymentIntent failed')
  }
  return res.json() as Promise<{ client_secret: string; id: string; amount: number }>
}
