import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../supabase'
import { getBarangayConfig } from '../../barangay-config'

export async function handleApproveRegistration(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    console.log('[Approve Registration] Starting approval process...')
    const { registrationId, processedBy } = await request.json()
    console.log('[Approve Registration] Registration ID:', registrationId)

    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 })
    }

    const { data: registration, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('id', registrationId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Registration not found', details: fetchError.message }, { status: 404 })
    }

    if (!registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    }

    const { data: existing } = await supabase
      .from('residents')
      .select('id')
      .ilike('first_name', registration.first_name)
      .ilike('last_name', registration.last_name)
      .eq('birthdate', registration.birthdate)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Duplicate resident already exists' }, { status: 409 })
    }

    const { error: insertError } = await supabase
      .from('residents')
      .insert({
        first_name: registration.first_name,
        middle_name: registration.middle_name,
        last_name: registration.last_name,
        suffix: registration.suffix || null,
        birthdate: registration.birthdate,
        age: registration.age,
        gender: registration.gender,
        civil_status: registration.civil_status,
        citizenship: registration.citizenship,
        purok: registration.purok,
        contact: registration.contact || null,
        photo_url: registration.photo_url || null,
        barangay_id: barangayConfig?.id || null
      })

    if (insertError) throw insertError

    const { error: updateError } = await supabase
      .from('pending_registrations')
      .update({
        status: 'approved',
        processed_by: processedBy || 'admin',
        processed_at: new Date().toISOString()
      })
      .eq('id', registrationId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Registration approved and added to residents'
    })
  } catch (error) {
    console.error('[Approve Registration] ERROR:', error)
    return NextResponse.json(
      { error: 'Failed to approve registration', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
