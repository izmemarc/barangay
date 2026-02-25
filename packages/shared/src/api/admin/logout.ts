import { NextResponse } from 'next/server'
import { clearSessionCookie } from './auth'

export async function handleAdminLogout() {
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
