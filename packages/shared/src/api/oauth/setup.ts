import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { generateAuthUrl } from '../../google-docs'

function getValidatedRedirectUri(request: Request): string {
  const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
  const cleanHost = host.split(':')[0].replace(/[^a-zA-Z0-9.-]/g, '')

  // Only allow localhost or explicitly configured redirect URI
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI
  }

  if (cleanHost === 'localhost' || cleanHost.startsWith('127.')) {
    const port = host.split(':')[1] || '3001'
    return `http://${cleanHost}:${port}/api/oauth/callback`
  }

  throw new Error(`Unrecognized host for OAuth redirect: ${cleanHost}`)
}

export async function handleOAuthSetup(request: Request) {
  try {
    const redirectUri = getValidatedRedirectUri(request)

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex')

    const { authUrl } = generateAuthUrl(redirectUri, state)

    // Set state in HttpOnly cookie so callback can verify it
    const response = NextResponse.redirect(authUrl)
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/api/oauth',
    })
    return response
  } catch (error: unknown) {
    console.error('[OAuth Setup] Error:', error)
    return NextResponse.json({ error: 'OAuth setup failed' }, { status: 500 })
  }
}
