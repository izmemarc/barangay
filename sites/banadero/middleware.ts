import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Default hash for password "admin" — must match auth.ts
const DEFAULT_HASH = '$2b$10$LTjIpZajawwJIIKZEhYqjeJpp/cK6ggnZtBjJxww07qpRm7.IczBG'

// Admin API paths that DON'T require auth
const PUBLIC_ADMIN_PATHS = [
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/facility-bookings', // used by public community section
]

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || DEFAULT_HASH
}

// Verify HMAC session token using Web Crypto (Edge-compatible)
async function verifySession(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return false
    const [payload, sig] = parts

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(getSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode base64url signature
    const sigStr = sig.replace(/-/g, '+').replace(/_/g, '/')
    const padded = sigStr + '='.repeat((4 - sigStr.length % 4) % 4)
    const sigBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload))
    if (!valid) return false

    // Check expiry
    const payloadStr = payload.replace(/-/g, '+').replace(/_/g, '/')
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4)
    const data = JSON.parse(atob(payloadPadded))
    return data.exp > Date.now()
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // Check if this is a protected admin API route
  if (pathname.startsWith('/api/admin') && !PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
    const token = request.cookies.get('admin_session')?.value
    if (!token || !(await verifySession(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Pass the hostname through to server components and API routes
  const response = NextResponse.next()
  response.headers.set('x-barangay-host', hostname)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
