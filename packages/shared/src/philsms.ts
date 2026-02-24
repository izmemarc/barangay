/**
 * Normalize Philippine phone numbers to 639XXXXXXXXX format
 * - 09123456789 -> 639123456789 (remove 0, add 63)
 * - +639123456789 -> 639123456789 (remove +)
 * - 9123456789 -> 639123456789 (add 63)
 * - Returns null if less than 10 digits
 */
export function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null

  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '')

  // Remove + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // If starts with 0, remove it
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // If starts with 63, use as is
  if (cleaned.startsWith('63')) {
    if (cleaned.length >= 12) {
      return cleaned
    }
    return null
  }

  // If starts with 9 and has at least 10 digits, add 63
  if (cleaned.startsWith('9') && cleaned.length >= 10) {
    return '63' + cleaned
  }

  return null
}

// All SMS credentials come from env vars:
// PHILSMS_API_TOKEN, PHILSMS_SENDER_ID, PHILSMS_NOTIFICATION_NUMBER

export async function sendSMS(recipient: string, message: string, senderId?: string) {
  const apiToken = process.env.PHILSMS_API_TOKEN
  const defaultSenderId = senderId || process.env.PHILSMS_SENDER_ID || 'PhilSMS'
  const normalizedRecipient = normalizePhoneNumber(recipient)

  console.log('[SMS] sendSMS called:', { senderId: defaultSenderId, messageLength: message.length })

  if (!normalizedRecipient) {
    console.error('[SMS] Invalid phone number format')
    return { success: false, error: 'Invalid phone number' }
  }

  if (!apiToken) {
    console.error('[SMS] PhilSMS API token not configured')
    return { success: false, error: 'SMS API not configured' }
  }

  try {
    console.log('[SMS] Making API request to PhilSMS...')
    const response = await fetch('https://dashboard.philsms.com/api/v3/sms/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        recipient: normalizedRecipient,
        sender_id: defaultSenderId,
        type: 'plain',
        message,
      }),
    })

    const data = await response.json()

    if (data.status === 'success') {
      console.log('[SMS] SMS sent successfully')
      return { success: true, data }
    } else {
      console.error('[SMS] PhilSMS error:', data)
      return { success: false, error: data.message || 'Failed to send SMS' }
    }
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Network error' }
  }
}

export async function notifyNewSubmission(type: string, name: string, purpose?: string) {
  const notificationNumber = process.env.PHILSMS_NOTIFICATION_NUMBER

  console.log('[SMS] notifyNewSubmission called:', { type })

  if (!notificationNumber) {
    console.error('[SMS] Notification number not configured in environment variables')
    return { success: false, error: 'Notification number not configured' }
  }

  const formattedType = type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  let message = `New ${formattedType} submission from ${name}`
  if (purpose) {
    message += ` - Purpose: ${purpose}`
  }

  return await sendSMS(notificationNumber, message)
}

export async function notifyDocumentGenerated(contactNumber: string, name: string, clearanceType: string) {
  console.log('[SMS] notifyDocumentGenerated called:', { clearanceType })

  const formattedType = clearanceType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  const message = `Your ${formattedType} document has been printed. Please visit the barangay office to claim it.`

  return await sendSMS(contactNumber, message)
}
