import { NextResponse } from 'next/server'
import { generateAuthUrl } from '../../google-docs'

export async function handleOAuthSetup(request: Request) {
  try {
    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || 'localhost:3001'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/oauth/callback`

    const { authUrl } = generateAuthUrl(redirectUri)
    return NextResponse.redirect(authUrl)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
