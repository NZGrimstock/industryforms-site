import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?gcal=error`)
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64url').toString())
    const redirectUri = `${appUrl}/api/google/callback`

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Google token exchange failed:', err)
      return NextResponse.redirect(`${appUrl}/settings?gcal=error`)
    }

    const tokens = await tokenRes.json() as {
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
    }

    const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const service = createServiceClient()
    const { error } = await service.from('profiles').update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token ?? null,
      google_token_expiry: expiry,
    }).eq('id', userId)

    if (error) {
      console.error('Failed to store Google tokens:', error)
      return NextResponse.redirect(`${appUrl}/settings?gcal=error`)
    }

    return NextResponse.redirect(`${appUrl}/settings?gcal=connected`)
  } catch (e) {
    console.error('Google callback error:', e)
    return NextResponse.redirect(`${appUrl}/settings?gcal=error`)
  }
}
