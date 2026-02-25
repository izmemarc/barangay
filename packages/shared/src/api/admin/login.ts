import { NextResponse } from 'next/server'
import { verifyPassword, createSessionToken, setSessionCookie, verifySessionToken } from './auth'

// In-memory rate limiter: IP -> { count, resetAt }
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > MAX_ATTEMPTS
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(ip)
  }
}, 300_000)

export async function handleAdminLogin(request: Request) {
  // GET — check if current session is valid
  if (request.method === 'GET') {
    const cookie = request.headers.get('cookie') || ''
    const match = cookie.match(/admin_session=([^;]+)/)
    const token = match?.[1]

    if (token && verifySessionToken(token)) {
      return NextResponse.json({ authenticated: true })
    }
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  // POST — login with password
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Try again in 1 minute.' },
        { status: 429 }
      )
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = createSessionToken()
    const response = NextResponse.json({ success: true })
    setSessionCookie(response, token)
    return response
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
