import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../supabase'
import { generateClearanceDocument, insertPhotoIntoDocument, getAuthClient } from '../../google-docs'
import { google } from 'googleapis'
import { notifyDocumentGenerated } from '../../philsms'
import { getBarangayConfig } from '../../barangay-config'
import { getOrdinal, toSentenceCase, parseFullName } from '../../utils'

// Fallback template IDs from site .env.local (each site has its own)
const ENV_TEMPLATES: Record<string, string | undefined> = {
  barangay: process.env.BARANGAY_TEMPLATE_ID,
  business: process.env.BUSINESS_TEMPLATE_ID,
  blotter: process.env.BLOTTER_TEMPLATE_ID,
  facility: process.env.FACILITY_TEMPLATE_ID,
  'good-moral': process.env.GOOD_MORAL_TEMPLATE_ID,
  indigency: process.env.INDIGENCY_TEMPLATE_ID,
  residency: process.env.RESIDENCY_TEMPLATE_ID,
  luntian: process.env.LUNTIAN_TEMPLATE_ID,
  'cso-accreditation': process.env.CSO_ACCREDITATION_TEMPLATE_ID,
  'barangay-id': process.env.BARANGAY_ID_TEMPLATE_ID,
}

async function boldTextInDocument(documentId: string, textToBold: string, auth: any): Promise<void> {
  try {
    const docs = google.docs({ version: 'v1', auth })

    // Get the document to find the text
    const doc = await docs.documents.get({ documentId })
    const content = doc.data.body?.content || []

    // Find all occurrences of the text
    const ranges: Array<{ startIndex: number; endIndex: number }> = []

    const searchInElements = (elements: any[]) => {
      for (const element of elements) {
        if (element.paragraph) {
          for (const textElement of element.paragraph.elements || []) {
            const text = textElement.textRun?.content || ''
            if (text.includes(textToBold)) {
              const startIndex = textElement.startIndex!
              const textStart = text.indexOf(textToBold)
              const actualStart = startIndex + textStart
              const actualEnd = actualStart + textToBold.length
              ranges.push({ startIndex: actualStart, endIndex: actualEnd })
            }
          }
        }
        // Search in table cells
        if (element.table) {
          for (const row of element.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              searchInElements(cell.content || [])
            }
          }
        }
      }
    }

    searchInElements(content)

    if (ranges.length === 0) {
      console.log(`[Bold] Text "${textToBold}" not found in document`)
      return
    }

    // Apply bold formatting to all found ranges
    const requests = ranges.map(range => ({
      updateTextStyle: {
        range: {
          startIndex: range.startIndex,
          endIndex: range.endIndex
        },
        textStyle: {
          bold: true
        },
        fields: 'bold'
      }
    }))

    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    })

    console.log(`[Bold] Successfully bolded "${textToBold}" in ${ranges.length} location(s)`)
  } catch (error) {
    console.error('[Bold] Error bolding text:', error)
    // Don't throw - formatting is optional
  }
}

function formatItemsList(
  requestedItems: string,
  bulletChar: string,
  formData: Record<string, string>
): string {
  if (!requestedItems) return ''

  const items = requestedItems.split(',').map((item: string) => item.trim()).filter((item: string) => item)
  const vegetableSeeds = formData.vegetableSeeds || ''
  const vegetableSeedsDetails = formData.vegetableSeedsDetails || ''
  const requestedItemsDetails = formData.requestedItemsDetails || ''

  const regularItems: string[] = []
  const othersItems: string[] = []

  items.forEach((item: string) => {
    if (item.toLowerCase() === 'others' && requestedItemsDetails) {
      othersItems.push(requestedItemsDetails)
    } else if (item.toLowerCase() !== 'others') {
      if (item.toLowerCase().includes('vegetable') && item.toLowerCase().includes('seed') && vegetableSeeds) {
        let seedsList = vegetableSeeds
        if (vegetableSeeds.includes('Others') && vegetableSeedsDetails) {
          seedsList = vegetableSeeds.replace(/Others/gi, vegetableSeedsDetails)
        }
        regularItems.push(`${item} (${seedsList})`)
      } else {
        regularItems.push(item)
      }
    }
  })

  const allItems = [...regularItems, ...othersItems]
  return allItems.map((item: string) => `${bulletChar} ${item}`).join('\n')
}

export async function handleGenerateClearance(request: Request) {
  const supabase = getSupabaseAdmin()
  try {
    const { submissionId, processedBy } = await request.json()

    const host = request.headers.get('x-barangay-host') || request.headers.get('host') || ''
    const barangayConfig = await getBarangayConfig(host)

    if (!submissionId) {
      return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
    }

    // Get submission from database
    const { data: submission, error: fetchError } = await supabase
      .from('clearance_submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Get resident data using resident_id from submission
    let resident = null
    let nameParts = { firstName: '', middleName: '', lastName: '', suffix: '' }

    if (submission.resident_id) {
      const { data: residentData } = await supabase
        .from('residents')
        .select('*')
        .eq('id', submission.resident_id)
        .single()

      resident = residentData

      if (resident) {
        // Use exact data from residents table
        nameParts = {
          firstName: resident.first_name || '',
          middleName: resident.middle_name || '',
          lastName: resident.last_name || '',
          suffix: resident.suffix || ''
        }
      }
    }

    // Fallback: parse name if no resident_id
    if (!resident) {
      nameParts = parseFullName(submission.name)
    }

    // Current date info
    const today = new Date()
    const dateIssued = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const month = today.toLocaleDateString('en-US', { month: 'long' })
    const dayNum = today.getDate()
    const year = today.getFullYear().toString()
    const dayOrd = getOrdinal(dayNum)

    // Build replacements based on clearance type
    let replacements: Record<string, string> = {}

    const clearanceType = submission.clearance_type

    // BARANGAY CLEARANCE - Update template to use <placeholder> format
    if (clearanceType === 'barangay') {
      replacements = {
        LastName: nameParts.lastName.toUpperCase(),
        FirstName: nameParts.firstName.toUpperCase(),
        MiddleName: nameParts.middleName.toUpperCase(),
        Suffix: nameParts.suffix.toUpperCase(),
        Purpose: submission.form_data.purpose || '',
        DateIssued: dateIssued,
        Sex: resident?.gender || '',
        MaritalStatus: resident?.civil_status ? toSentenceCase(resident.civil_status) : '',
        Citizenship: resident?.citizenship || '',
        Address: resident?.purok || '',
        Age: resident?.age?.toString() || '',
        Birthdate: resident?.birthdate ? new Date(resident.birthdate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
      }
    }
    // BUSINESS CLEARANCE - Update template to use <placeholder> format
    else if (clearanceType === 'business') {
      replacements = {
        FirstName: nameParts.firstName.toUpperCase(),
        MiddleName: nameParts.middleName.toUpperCase(),
        LastName: nameParts.lastName.toUpperCase(),
        Suffix: nameParts.suffix.toUpperCase(),
        Occupation: submission.form_data.occupation || '',
        Contact: submission.form_data.contact || '',
        Business: submission.form_data.businessName || submission.form_data.business || '',
        Address: submission.form_data.businessAddress || submission.form_data.address || '',
        Purok: resident?.purok || '',
        Nationality: resident?.citizenship || '',
        Civil: resident?.civil_status ? toSentenceCase(resident.civil_status) : '',
        DateIssued: dateIssued
      }
    }
    // BLOTTER - Uses <placeholder> format
    else if (clearanceType === 'blotter') {
      const submissionTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      replacements = {
        date: dateIssued,
        time: submissionTime,
        name: submission.name || '',
        address: submission.form_data.address || resident?.purok || '',
        contact_no: submission.form_data.contact || '',
        age: submission.form_data.age || resident?.age?.toString() || '',
        civil_status: submission.form_data.civilStatus ? toSentenceCase(submission.form_data.civilStatus) : (resident?.civil_status ? toSentenceCase(resident.civil_status) : ''),
        name2: submission.form_data.respondentName || '',
        address2: submission.form_data.respondentAddress || '',
        age2: submission.form_data.respondentAge || '',
        civil_status2: submission.form_data.respondentCivil ? toSentenceCase(submission.form_data.respondentCivil) : '',
        incident: submission.form_data.incidentType || submission.form_data.incident || '',
        incident_description: submission.form_data.incidentDescription || '',
        incident_date: submission.form_data.incidentDate || '',
        incident_place: submission.form_data.incidentLocation || submission.form_data.incidentPlace || '',
        incident_time: submission.form_data.incidentTime || ''
      }
    }
    // FACILITY - Uses <placeholder> format
    else if (clearanceType === 'facility') {
      const submissionTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

      // Calculate amount based on hours and facility selection
      let calculatedAmount = ''
      const startTime = submission.form_data.startTime
      const endTime = submission.form_data.endTime
      const facility = submission.form_data.facility || ''

      if (startTime && endTime && facility) {
        // Parse time strings (format: "HH:MM")
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)

        // Calculate duration in minutes
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin
        const durationMinutes = endMinutes - startMinutes

        // Round up to nearest hour (any partial hour = full hour)
        // Examples: 1:30 = 2 hours, 2:01 = 3 hours, 3:00 = 3 hours
        const hours = Math.ceil(durationMinutes / 60)

        // Extract rate from facility selection
        // "Basketball Court Daytime (500 php/hour)" -> 500
        // "Basketball Court Nighttime (700 php/hour)" -> 700
        let ratePerHour = 500 // default
        const rateMatch = facility.match(/\((\d+)\s*php\/hour\)/)
        if (rateMatch) {
          ratePerHour = parseInt(rateMatch[1])
        }

        const totalAmount = ratePerHour * hours

        calculatedAmount = `\u20B1${totalAmount.toFixed(2)}`
      }

      replacements = {
        or: '', // Template has <or> but we're leaving it blank
        date: dateIssued,
        time: submissionTime,
        month: month,
        day: dayNum.toString(),
        year: year,
        name: submission.name.toUpperCase(),
        address: resident?.purok || submission.form_data.address || '',
        contact_no: submission.form_data.contact || '',
        civil_status: resident?.civil_status ? toSentenceCase(resident.civil_status) : '',
        age: resident?.age?.toString() || '',
        facility: submission.form_data.facility || '',
        purpose: submission.form_data.purpose || '',
        usedate: submission.form_data.eventDate || submission.form_data.date || '',
        start: submission.form_data.startTime || '',
        end: submission.form_data.endTime || '',
        number: submission.form_data.participants || '',
        equipment: submission.form_data.equipment || '',
        amount: calculatedAmount
      }
    }
    // GOOD MORAL - Uses <placeholder> format (case-sensitive: <first>, <Middle>, <Last>)
    else if (clearanceType === 'good-moral') {
      replacements = {
        first: nameParts.firstName.toUpperCase(),
        Middle: nameParts.middleName.toUpperCase(),
        Last: nameParts.lastName.toUpperCase(),
        civil: resident?.civil_status || '',
        address: resident?.purok || '',
        day: dayOrd,
        month: month,
        year: year,
        pay_month: month,
        pay_day: dayNum.toString().padStart(2, '0'),
        pay_year: year
      }
    }
    // INDIGENCY - Uses <placeholder> format (exact case: <first>, <Middle>, <Last>, <Purok>)
    else if (clearanceType === 'indigency') {
      replacements = {
        first: nameParts.firstName.toUpperCase(),
        Middle: nameParts.middleName.toUpperCase(),
        Last: nameParts.lastName.toUpperCase(),
        age: resident?.age?.toString() || '',
        civil: resident?.civil_status || '',
        Purok: resident?.purok || '',
        day: dayOrd,
        month: month,
        year: year,
        purpose: submission.form_data.purpose || ''
      }
    }
    // RESIDENCY - Uses <placeholder> format (exact case: <first>, <Middle>, <Last>)
    else if (clearanceType === 'residency') {
      const yearResided = submission.form_data.yearResided || ''
      let startText = yearResided

      // If it's just a year number
      if (/^\d{4}$/.test(yearResided)) {
        startText = yearResided
      }

      replacements = {
        first: nameParts.firstName.toUpperCase(),
        Middle: nameParts.middleName.toUpperCase(),
        Last: nameParts.lastName.toUpperCase(),
        civil: resident?.civil_status || '',
        address: resident?.purok || '',
        start: startText,
        day: dayOrd,
        month: month,
        year: year,
        issued_month: month,
        issued_day: dayNum.toString(),
        issued_year: year
      }
    }
    // LUNTIAN - Uses <placeholder> format
    else if (clearanceType === 'luntian') {
      // Date of request is when the form was submitted (created_at)
      const requestDate = submission.created_at
        ? new Date(submission.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : dateIssued

      const requestedItems = submission.form_data.requestedItems || ''
      const requestedItemsList = formatItemsList(requestedItems, '\u2022', submission.form_data)
      const releasedItemsList = formatItemsList(requestedItems, '\u25A1', submission.form_data)

      replacements = {
        date: requestDate,
        dateprinted: dateIssued, // Date when document is generated
        name: submission.name || '',
        items: requestedItemsList,
        releaseditems: releasedItemsList,
        purpose: submission.form_data.purposeOfRequest || ''
      }
    }
    // CSO/NGO ACCREDITATION - Uses <placeholder> format
    else if (clearanceType === 'cso-accreditation') {
      const regDate = submission.form_data.registrationDate
        ? new Date(submission.form_data.registrationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''

      // Calculate bullet points for section VII
      const advocacyItems = submission.form_data.advocacy ? submission.form_data.advocacy.split(', ') : []
      const advocacyBullets = advocacyItems.map((item: string) => `\u2022 ${item.trim()}`).join('\n')
      const advocacyLines = advocacyItems.length

      // Calculate bullet points for section VIII
      const specialBodyItems = submission.form_data.specialBody ? submission.form_data.specialBody.split(', ') : []
      const specialBodyBullets = specialBodyItems.map((item: string) => `\u2022 ${item.trim()}`).join('\n')
      const specialBodyLines = specialBodyItems.length

      // Total lines used by both sections
      const totalUsedLines = advocacyLines + specialBodyLines

      // Calculate how many blank lines to add to reach 16 total
      const blankLinesToAdd = Math.max(0, 16 - totalUsedLines)

      // Add all blank lines after section VIII
      const viiContent = advocacyBullets
      const viiiContent = specialBodyBullets + '\n'.repeat(blankLinesToAdd)

      replacements = {
        name: submission.form_data.orgName || '',
        acronym: submission.form_data.orgAcronym || '',
        type: submission.form_data.orgType || '',
        nature: submission.form_data.orgNature || '',
        agency: submission.form_data.registeringAgency || '',
        regnumber: submission.form_data.registrationNo || '',
        regdate: regDate,
        address: submission.form_data.officeAddress || '',
        number: submission.form_data.contact || '',
        email: submission.form_data.email || '',
        pres: submission.form_data.president || '',
        tpres: submission.form_data.presidentTenure || '',
        vice: submission.form_data.vicePresident || '',
        tvice: submission.form_data.vicePresidentTenure || '',
        sec: submission.form_data.secretary || '',
        tsec: submission.form_data.secretaryTenure || '',
        tres: submission.form_data.treasurer || '',
        ttres: submission.form_data.treasurerTenure || '',
        aud: submission.form_data.auditor || '',
        taud: submission.form_data.auditorTenure || '',
        members: submission.form_data.totalMembers?.toString() || '',
        residing: submission.form_data.barangayMembers?.toString() || '',
        vii: viiContent,
        viii: viiiContent,
        ix: '' // Documentary requirements - to be filled manually
      }
    }
    // BARANGAY ID - Uses <placeholder> format based on the ID card image
    // Get data from resident database if available, otherwise from form data
    else if (clearanceType === 'barangay-id') {
      // Format birthday from resident data
      let formattedBirthday = ''
      if (resident?.birthdate) {
        const birthDate = new Date(resident.birthdate)
        formattedBirthday = birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      }

      replacements = {
        name: submission.name.toUpperCase(),
        contactno: submission.form_data.contact_no || '',
        contactnumber: submission.form_data.contact_no || '',
        purok: resident?.purok || submission.form_data.purok || '',
        birthday: formattedBirthday || submission.form_data.birthday || '',
        sex: resident?.gender || submission.form_data.sex || '',
        citizenship: resident?.citizenship || submission.form_data.citizenship || '',
        blood: submission.form_data.blood_type || '',
        bloodtype: submission.form_data.blood_type || '',
        sss: submission.form_data.sss_no || '',
        tin: submission.form_data.tin_no || '',
        passport: submission.form_data.passport_no || '',
        pasport: submission.form_data.passport_no || '',
        other: submission.form_data.other_id_no || '',
        precinct: submission.form_data.precinct_no || '',
        occupation: submission.form_data.occupation || '',
        contactperson: submission.form_data.contact_person || '',
        cpnumber: submission.form_data.cp_number || submission.form_data.cpnumber || '',
        validity: submission.form_data.id_validity || '',
        age: resident?.age?.toString() || submission.form_data.age || ''
      }
    }

    // Template IDs from site .env.local
    const templateId = ENV_TEMPLATES[submission.clearance_type]
    const outputFolderId = process.env.GOOGLE_DRIVE_OUTPUT_FOLDER_ID

    if (!templateId) {
      return NextResponse.json({ error: `No template configured for "${submission.clearance_type}"` }, { status: 500 })
    }

    if (!outputFolderId) {
      return NextResponse.json({ error: 'No Google Drive output folder configured' }, { status: 500 })
    }

    const fileName = `${submission.name} - ${submission.clearance_type.replace('-', ' ')} Clearance`

    // Insert photo BEFORE text replacements (so {{picture}} placeholder exists)
    let documentId: string
    let documentUrl: string

    // Clearance types that support photo insertion
    const photoSupportedTypes = ['barangay', 'barangay-id', 'indigency', 'good-moral', 'residency']

    if (photoSupportedTypes.includes(clearanceType)) {
      // Generate document first (empty — no text replacements yet)
      const result = await generateClearanceDocument(
        templateId,
        outputFolderId,
        {},  // No replacements yet
        fileName,
      )
      documentId = result.documentId
      documentUrl = result.documentUrl

      // Insert photo while placeholder still exists
      // Use smaller size (1.4cm = 39.685 PT) for barangay ID, default size (90 PT) for others
      const photoSize = clearanceType === 'barangay-id' ? 39.685 : 90
      await insertPhotoIntoDocument(
        documentId,
        resident?.photo_url || null,
        photoSize,
      )

      // Now apply text replacements
      const auth = getAuthClient()
      const docs = google.docs({ version: 'v1', auth })
      const requests = Object.entries(replacements).map(([placeholder, value]) => ({
        replaceAllText: {
          containsText: {
            text: `<${placeholder}>`,
            matchCase: true
          },
          replaceText: value || ''
        }
      }))

      if (requests.length > 0) {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: { requests }
        })
      }

      // For barangay ID, bold the name
      if (clearanceType === 'barangay-id') {
        await boldTextInDocument(documentId, submission.name.toUpperCase(), auth)
      }
    } else {
      // No photo, just do text replacements
      const result = await generateClearanceDocument(
        templateId,
        outputFolderId,
        replacements,
        fileName,
      )
      documentId = result.documentId
      documentUrl = result.documentUrl

      // For barangay ID, bold the name
      if (clearanceType === 'barangay-id') {
        const auth = getAuthClient()
        await boldTextInDocument(documentId, submission.name.toUpperCase(), auth)
      }
    }

    // Update submission status
    const { error: updateError } = await supabase
      .from('clearance_submissions')
      .update({
        status: 'approved',
        document_url: documentUrl,
        processed_by: processedBy || 'admin',
        processed_at: new Date().toISOString()
      })
      .eq('id', submissionId)

    if (updateError) {
      throw updateError
    }

    // Send SMS notification to contact if available
    const contactNumber = submission.form_data.contact || submission.form_data.contactNumber || submission.form_data.contact_no
    if (contactNumber) {
      try {
        console.log('[SMS] Attempting to send document notification...')
        const smsResult = await notifyDocumentGenerated(contactNumber, submission.name, submission.clearance_type)
        if (smsResult?.success) {
          console.log('[SMS] Document notification sent successfully to:', contactNumber)
        } else {
          console.error('[SMS] Failed to send document notification:', smsResult?.error)
        }
      } catch (smsError) {
        console.error('[SMS] Exception sending document notification:', smsError)
        // Don't fail the request if SMS fails
      }
    } else {
      console.log('[SMS] No contact number found in submission, skipping SMS notification')
    }

    return NextResponse.json({
      success: true,
      documentUrl
    })

  } catch (error: any) {
    console.error('=== ERROR GENERATING CLEARANCE ===')
    console.error('Error:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('===================================')

    // Provide more specific error messages
    let errorMessage = 'Failed to generate document'
    let errorDetails = error instanceof Error ? error.message : 'Unknown error'

    if (error?.code === 400 || error?.message?.includes('invalid_grant')) {
      errorMessage = 'Google OAuth token expired. Please re-authenticate at /api/oauth/setup'
      errorDetails = 'invalid_grant - token expired or revoked'
    } else if (error?.code === 403) {
      errorMessage = 'Google API permission denied. Check template/folder sharing.'
      errorDetails = error.message
    } else if (error?.code === 404) {
      errorMessage = 'Google template or folder not found. Check template IDs.'
      errorDetails = error.message
    }

    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    )
  }
}
