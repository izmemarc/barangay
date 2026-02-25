import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../supabase'
import { getBarangayConfig } from '../../barangay-config'

export async function handleApproveRegistration(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const { registrationId, processedBy } = await request.json()

    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    if (!registrationId) {
      return NextResponse.json({ error: 'Missing registrationId' }, { status: 400 })
    }

    // Atomically claim the registration: only succeed if status is still 'pending'
    const { data: claimed, error: claimError } = await supabase
      .from('pending_registrations')
      .update({
        status: 'approved',
        processed_by: processedBy || 'admin',
        processed_at: new Date().toISOString()
      })
      .eq('id', registrationId)
      .eq('status', 'pending') // Only update if still pending — prevents race condition
      .select()
      .single()

    if (claimError || !claimed) {
      // Either not found or already processed by another admin
      return NextResponse.json(
        { error: 'Registration not found or already processed' },
        { status: 409 }
      )
    }

    // Check for duplicate resident before inserting
    const { data: existing } = await supabase
      .from('residents')
      .select('id')
      .ilike('first_name', claimed.first_name)
      .ilike('last_name', claimed.last_name)
      .eq('birthdate', claimed.birthdate)
      .maybeSingle()

    if (existing) {
      // Revert status since we can't insert a duplicate
      await supabase
        .from('pending_registrations')
        .update({ status: 'pending', processed_by: null, processed_at: null })
        .eq('id', registrationId)

      return NextResponse.json({ error: 'Duplicate resident already exists' }, { status: 409 })
    }

    const { error: insertError } = await supabase
      .from('residents')
      .insert({
        first_name: claimed.first_name,
        middle_name: claimed.middle_name,
        last_name: claimed.last_name,
        suffix: claimed.suffix || null,
        birthdate: claimed.birthdate,
        age: claimed.age,
        gender: claimed.gender,
        civil_status: claimed.civil_status,
        citizenship: claimed.citizenship,
        purok: claimed.purok,
        contact: claimed.contact || null,
        photo_url: claimed.photo_url || null,
        barangay_id: barangayConfig?.id || null
      })

    if (insertError) {
      // Revert the status change so it can be retried
      await supabase
        .from('pending_registrations')
        .update({ status: 'pending', processed_by: null, processed_at: null })
        .eq('id', registrationId)

      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: 'Registration approved and added to residents'
    })
  } catch (error) {
    console.error('[Approve Registration] ERROR:', error)
    return NextResponse.json(
      { error: 'Failed to approve registration' },
      { status: 500 }
    )
  }
}
