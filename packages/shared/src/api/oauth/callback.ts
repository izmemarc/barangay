import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { promises as fs } from 'fs'
import path from 'path'

function getValidatedRedirectUri(request: Request): string {
  const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
  const cleanHost = host.split(':')[0].replace(/[^a-zA-Z0-9.-]/g, '')

  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI
  }

  if (cleanHost === 'localhost' || cleanHost.startsWith('127.')) {
    const port = host.split(':')[1] || '3001'
    return `http://${cleanHost}:${port}/api/oauth/callback`
  }

  throw new Error(`Unrecognized host for OAuth redirect: ${cleanHost}`)
}

export async function handleOAuthCallback(request: Request) {
  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'No authorization code' }, { status: 400 })
    }

    const redirectUri = getValidatedRedirectUri(request)

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    const { tokens } = await oauth2Client.getToken(code)
    const refreshToken = tokens.refresh_token

    if (!refreshToken) {
      return new Response(page('Token Error',
        'No refresh token returned. Google only gives a refresh token on first consent or when you use prompt=consent. Try revoking access at <a href="https://myaccount.google.com/permissions">Google Permissions</a> and try again.',
        'error'), { headers: { 'Content-Type': 'text/html' } })
    }

    console.log('[OAuth Callback] Refresh token obtained. Attempting auto-save...')

    let saved = false
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      let envContent = await fs.readFile(envPath, 'utf-8')

      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /^GOOGLE_REFRESH_TOKEN=.*/m,
          `GOOGLE_REFRESH_TOKEN=${refreshToken}`
        )
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`
      }

      await fs.writeFile(envPath, envContent, 'utf-8')
      saved = true
    } catch {
      saved = false
    }

    const statusMsg = saved
      ? 'Token saved to .env.local automatically.<br>Now run <code>update-token.ps1</code> to push it to the server, then restart your dev server.'
      : 'Could not auto-save. Check server logs and manually update .env.local with the new refresh token.'

    return new Response(page('Token Refreshed', statusMsg, 'success'), {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error: unknown) {
    console.error('[OAuth Callback] Error:', error)
    return new Response(page('OAuth Error', 'Token exchange failed. Please try again or check server logs.', 'error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function page(title: string, message: string, type: 'success' | 'error') {
  const color = type === 'success' ? '#22c55e' : '#ef4444'
  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem; max-width: 500px; text-align: center; }
  h1 { color: ${color}; margin-top: 0; }
  code { background: #333; padding: 2px 8px; border-radius: 4px; font-size: 0.85em; word-break: break-all; }
  a { color: #60a5fa; }
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`
}
