import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Default hash for password "admin" — change via ADMIN_PASSWORD_HASH env var
const DEFAULT_HASH = '$2b$10$LTjIpZajawwJIIKZEhYqjeJpp/cK6ggnZtBjJxww07qpRm7.IczBG'

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || DEFAULT_HASH
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH || DEFAULT_HASH
  return bcrypt.compare(password, hash)
}

export function createSessionToken(): string {
  const exp = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url')
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string): boolean {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return false

    const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
    if (sig !== expectedSig) return false

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return data.exp > Date.now()
  } catch {
    return false
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production'
  response.headers.append(
    'Set-Cookie',
    `admin_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${isProduction ? '; Secure' : ''}`
  )
}

export function clearSessionCookie(response: NextResponse): void {
  response.headers.append(
    'Set-Cookie',
    'admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
  )
}
