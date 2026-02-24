import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../supabase'
import { getBarangayConfig } from '../../barangay-config'

export async function handleGetRegistrations(request: Request) {
  const supabase = getSupabaseAdmin()
  const startTime = Date.now()
  console.log('[API] GET /api/admin/registrations started')
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

    const queryStart = Date.now()
    const { data, error, count } = await query
    console.log(`[API] Supabase query took ${Date.now() - queryStart}ms`)

    if (error) throw error

    console.log(`[API] GET /api/admin/registrations completed in ${Date.now() - startTime}ms, rows: ${data?.length || 0}`)
    return NextResponse.json({ data, total: count, limit, offset })
  } catch (error) {
    console.error('[API] Error fetching registrations:', error)
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  }
}

export async function handlePatchRegistration(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const { registrationId, status } = await request.json()

    if (!registrationId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
