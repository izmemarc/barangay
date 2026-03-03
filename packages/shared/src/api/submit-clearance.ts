import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../supabase'
import { notifyNewSubmission } from '../philsms'
import { getBarangayConfig } from '../barangay-config'
import { uploadResidentPhoto } from './upload-photo'

export async function handleSubmitClearance(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { clearanceType, name, formData, residentId, capturedPhoto } = body

    if (!clearanceType || !name || !formData) {
      return NextResponse.json(
        { error: 'Missing required fields: clearanceType, name, formData' },
        { status: 400 }
      )
    }

    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    // If photo was captured, upload it to storage and update resident record
    let photoWarning: string | undefined
    if (capturedPhoto && residentId) {
      try {
        const { data: resident, error: residentError } = await supabase
          .from('residents')
          .select('first_name, middle_name, last_name')
          .eq('id', residentId)
          .single()

        if (residentError) {
          throw residentError
        }

        if (resident) {
          try {
            const photoUrl = await uploadResidentPhoto({
              base64Photo: capturedPhoto,
              lastName: resident.last_name,
              firstName: resident.first_name,
              middleName: resident.middle_name,
              bucket: barangayConfig?.slug || 'banadero',
              supabase,
            })
            // Save photo_url to resident record
            await supabase
              .from('residents')
              .update({ photo_url: photoUrl })
              .eq('id', residentId)
          } catch (uploadErr) {
            photoWarning = 'Photo upload failed, but submission was saved.'
          }
        }
      } catch {
        photoWarning = 'Photo processing failed, but submission was saved.'
      }
    }

    const { data, error } = await supabase
      .from('clearance_submissions')
      .insert({
        clearance_type: clearanceType,
        name: name,
        form_data: formData,
        resident_id: residentId || null,
        status: 'pending',
        barangay_id: barangayConfig?.id || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to submit clearance' }, { status: 500 })
    }

    try {
      await notifyNewSubmission(clearanceType, name, formData.purpose)
    } catch {
      // SMS failure is non-critical
    }

    return NextResponse.json({ data, ...(photoWarning && { warning: photoWarning }) })
  } catch {
    return NextResponse.json(
      { error: 'Failed to submit clearance' },
      { status: 500 }
    )
  }
}
