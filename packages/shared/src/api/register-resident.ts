import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../supabase'
import { notifyNewSubmission } from '../philsms'
import { getBarangayConfig } from '../barangay-config'
import { uploadResidentPhoto } from './upload-photo'

export async function handleRegisterResident(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const formData = await request.json()

    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    if (!formData.firstName || !formData.lastName || !formData.birthdate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!formData.photo) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('residents')
      .select('id, first_name, last_name, birthdate, purok')
      .ilike('first_name', formData.firstName)
      .ilike('last_name', formData.lastName)
      .eq('birthdate', formData.birthdate)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: 'Potential duplicate found',
        duplicate: {
          name: `${existing.first_name} ${existing.last_name}`,
          birthdate: existing.birthdate,
          purok: existing.purok
        }
      }, { status: 409 })
    }

    const birthDate = new Date(formData.birthdate)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    let photoUrl: string | null = null
    try {
      photoUrl = await uploadResidentPhoto({
        base64Photo: formData.photo,
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        suffix: formData.suffix,
        bucket: barangayConfig?.slug || 'banadero',
        supabase,
      })
    } catch (photoError) {
      console.error('[Photo] Error processing photo:', photoError)
      return NextResponse.json({ error: 'Failed to process photo' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('pending_registrations')
      .insert({
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName,
        suffix: formData.suffix || null,
        birthdate: formData.birthdate,
        age: age,
        gender: formData.gender,
        civil_status: formData.civilStatus,
        citizenship: formData.citizenship || 'Filipino',
        purok: formData.purok,
        contact: formData.contact || null,
        status: 'pending',
        photo_url: photoUrl,
        barangay_id: barangayConfig?.id || null
      })
      .select()
      .single()

    if (error) throw error

    try {
      const fullName = `${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`.trim()
      await notifyNewSubmission('resident-registration', fullName)
    } catch (smsError) {
      console.error('[SMS] Exception:', smsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully. Pending admin approval.'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
