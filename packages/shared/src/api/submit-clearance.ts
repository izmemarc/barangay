import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../supabase'
import { notifyNewSubmission } from '../philsms'
import { getBarangayConfig } from '../barangay-config'
import { uploadResidentPhoto } from './upload-photo'

export async function handleSubmitClearance(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const body = await request.json()
    const { clearanceType, name, formData, residentId, capturedPhoto } = body

    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    console.log('[Photo] Request received:', {
      hasPhoto: !!capturedPhoto,
      clearanceType
    })

    // If photo was captured, upload it to storage and update resident record
    let photoWarning: string | undefined
    if (capturedPhoto && residentId) {
      console.log('[Photo] Starting upload process...')
      try {
        const { data: resident, error: residentError } = await supabase
          .from('residents')
          .select('first_name, middle_name, last_name')
          .eq('id', residentId)
          .single()

        if (residentError) {
          console.error('[Photo] Error fetching resident:', residentError)
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
            console.log('[Photo] Uploaded and saved to resident')
          } catch (uploadErr) {
            console.error('[Photo] Upload error:', uploadErr)
            photoWarning = 'Photo upload failed, but submission was saved.'
          }
        }
      } catch (photoError) {
        console.error('[Photo] Error processing photo:', photoError)
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
      console.error('[Supabase] Insert error:', error)
      return NextResponse.json({ error: 'Failed to submit clearance' }, { status: 500 })
    }

    try {
      const smsResult = await notifyNewSubmission(clearanceType, name, formData.purpose)
      if (smsResult?.success) {
        console.log('[SMS] Notification sent successfully')
      }
    } catch (smsError) {
      console.error('[SMS] Exception sending notification:', smsError)
    }

    return NextResponse.json({ data, ...(photoWarning && { warning: photoWarning }) })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit clearance' },
      { status: 500 }
    )
  }
}
