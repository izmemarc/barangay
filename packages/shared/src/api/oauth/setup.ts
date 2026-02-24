import { NextResponse } from 'next/server'
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

    const { authUrl } = generateAuthUrl(redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    console.error('[OAuth Setup] Error:', error)
    return NextResponse.json({ error: 'OAuth setup failed' }, { status: 500 })
  }
}
