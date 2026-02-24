import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function handleOAuthHealth() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || ''

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ valid: false, error: 'Missing OAuth credentials' }, { status: 500 })
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await oauth2Client.refreshAccessToken()

    return NextResponse.json({
      valid: true,
      message: 'OAuth token is valid',
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown'
    })
  } catch (error: any) {
    console.error('[OAuth Health] Token validation failed:', error.message)
    return NextResponse.json({
      valid: false,
      error: error.code === 400 ? 'Token expired or revoked - please regenerate' : 'Token validation failed'
    }, { status: 400 })
  }
}
