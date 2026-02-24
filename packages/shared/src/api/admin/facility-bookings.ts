import { NextResponse } from 'next/server'
import { supabase } from '../../supabase'
import { getBarangayConfig } from '../../barangay-config'

export async function handleGetFacilityBookings(request: Request) {
  try {
    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('clearance_submissions')
      .select('*')
      .eq('clearance_type', 'facility')
      .eq('status', 'approved')

    if (barangayConfig) {
      query = query.eq('barangay_id', barangayConfig.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching facility bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch facility bookings' }, { status: 500 })
    }

    const basketballBookings = (data || [])
      .filter(booking => {
        const facility = booking.form_data?.facility || ''
        const eventDate = booking.form_data?.eventDate || ''
        return facility.toLowerCase().includes('basketball court') && eventDate >= today
      })
      .sort((a, b) => {
        const dateA = a.form_data?.eventDate || ''
        const dateB = b.form_data?.eventDate || ''
        return dateA.localeCompare(dateB)
      })

    return NextResponse.json({ data: basketballBookings }, { status: 200 })
  } catch (error) {
    console.error('Error fetching facility bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch facility bookings' }, { status: 500 })
  }
}
