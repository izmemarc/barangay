import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../supabase'
import { getBarangayConfig } from '../../barangay-config'

export async function handleGetRegistrations(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

    let query = supabase
      .from('pending_registrations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (barangayConfig) {
      query = query.eq('barangay_id', barangayConfig.id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, total: count, limit, offset })
  } catch (error) {
    console.error('[API] Error fetching registrations:', error)
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  }
}

const VALID_REG_STATUSES = ['pending', 'approved', 'rejected'] as const

export async function handlePatchRegistration(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const { registrationId, status } = await request.json()

    if (!registrationId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_REG_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_REG_STATUSES.join(', ')}` }, { status: 400 })
    }

    const { error } = await supabase
      .from('pending_registrations')
      .update({ status, processed_at: new Date().toISOString() })
      .eq('id', registrationId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}
