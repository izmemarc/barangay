import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file'
]

// Cached OAuth client — reused across generateClearanceDocument, insertPhotoIntoDocument, etc.
let cachedAuthClient: InstanceType<typeof google.auth.OAuth2> | null = null

export function getAuthClient() {
  if (cachedAuthClient) return cachedAuthClient

  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || ''
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing OAuth credentials. Need: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN')
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  })

  cachedAuthClient = oauth2Client
  return oauth2Client
}

// Copy template and replace placeholders
export async function generateClearanceDocument(
  templateId: string,
  outputFolderId: string,
  replacements: Record<string, string>,
  fileName: string,
): Promise<{ documentId: string; documentUrl: string }> {
  try {
    const auth = getAuthClient()
    // Force token refresh before any API calls
    await auth.getAccessToken()
    const drive = google.drive({ version: 'v3', auth })
    const docs = google.docs({ version: 'v1', auth })

    // Copy template to output folder (uses YOUR Drive quota)
    let copy
    let retries = 0
    const maxRetries = 3

    while (retries < maxRetries) {
      try {
        copy = await drive.files.copy({
          fileId: templateId,
          requestBody: {
            name: fileName,
            parents: [outputFolderId],
            mimeType: 'application/vnd.google-apps.document'
          },
          fields: 'id'
        })
        break
      } catch (error: any) {
        if (error.code === 403 && error.message?.includes('rate limit') && retries < maxRetries - 1) {
          retries++
          const waitTime = Math.pow(2, retries) * 1000 // exponential backoff: 2s, 4s, 8s
          console.log(`[Google Docs] Rate limited, retrying in ${waitTime}ms (attempt ${retries}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        } else {
          throw error
        }
      }
    }

    const documentId = copy!.data.id!
    console.log(`[Google Docs] Created document: ${documentId}`)

    // Build replacement requests - exclude 'picture' as it's handled separately
    // Uses <placeholder> format for all templates
    const requests = Object.entries(replacements)
      .filter(([placeholder]) => placeholder.toLowerCase() !== 'picture')
      .map(([placeholder, value]) => ({
        replaceAllText: {
          containsText: {
            text: `<${placeholder}>`,
            matchCase: true  // Keep case-sensitive to match exact placeholder names
          },
          replaceText: value || ''
        }
      }))

    // Apply replacements
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      })
    }

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`

    return { documentId, documentUrl }
  } catch (error: any) {
    console.error('Error generating document:', error)

    // Check if it's an OAuth error
    if (error.code === 400 || error.message?.includes('invalid_grant')) {
      console.error('OAUTH TOKEN EXPIRED OR INVALID!')
      console.error('Regenerate token at: /api/oauth/setup')
    }

    throw error
  }
}

// Insert photo into document using a direct URL
export async function insertPhotoIntoDocument(
  documentId: string,
  photoUrl: string | null,
  photoSize: number = 90, // Default size in PT (90 PT = ~3.17 cm)
): Promise<boolean> {
  const auth = getAuthClient()
  await auth.getAccessToken()
  const docs = google.docs({ version: 'v1', auth })

  // No photo URL — clear placeholders and return
  if (!photoUrl) {
    console.log('[Photo] No photo URL provided, clearing placeholders')
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          { replaceAllText: { containsText: { text: '<picture>', matchCase: false }, replaceText: '' } },
          { replaceAllText: { containsText: { text: '<pic>', matchCase: false }, replaceText: '' } },
        ]
      }
    })
    return false
  }

  console.log('[Photo] Inserting photo into document')

  // Get document content to locate placeholder
  const doc = await docs.documents.get({ documentId })
  const content = doc.data.body?.content || []

  // Search for <picture> or <pic> in paragraphs and table cells
  let textElement: any = null

  const findPlaceholder = (elements: any[]): boolean => {
    for (const element of elements) {
      if (element.paragraph) {
        for (const te of element.paragraph.elements || []) {
          const text = te.textRun?.content || ''
          const lower = text.toLowerCase()
          if (lower.includes('<picture>') || lower.includes('< picture >') ||
              lower.includes('<pic>') || lower.includes('< pic >')) {
            textElement = te
            return true
          }
        }
      }
      if (element.table) {
        for (const row of element.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            if (findPlaceholder(cell.content || [])) return true
          }
        }
      }
    }
    return false
  }

  findPlaceholder(content)

  if (!textElement?.textRun?.content) {
    console.log('[Photo] No <picture> or <pic> placeholder found in document')
    return false
  }

  // Find exact placeholder position within the text element
  const lower = textElement.textRun.content.toLowerCase()
  const patterns: [string, number][] = [
    ['<picture>', 9], ['< picture >', 11], ['<pic>', 5], ['< pic >', 7]
  ]

  let offset = -1
  let length = 0
  for (const [pat, len] of patterns) {
    offset = lower.indexOf(pat)
    if (offset !== -1) { length = len; break }
  }

  if (offset === -1) {
    console.log('[Photo] Placeholder not found in text element')
    return false
  }

  const startIndex = textElement.startIndex + offset
  const endIndex = startIndex + length

  // Replace placeholder with inline image
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        { deleteContentRange: { range: { startIndex, endIndex } } },
        {
          insertInlineImage: {
            location: { index: startIndex },
            uri: photoUrl,
            objectSize: {
              height: { magnitude: photoSize, unit: 'PT' },
              width: { magnitude: photoSize, unit: 'PT' }
            }
          }
        }
      ]
    }
  })

  console.log('[Photo] Photo inserted successfully')
  return true
}

// Helper to generate OAuth URL (run once to get refresh token)
export function generateAuthUrl(redirectUri?: string, state?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const uri = redirectUri || process.env.GOOGLE_REDIRECT_URI

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, uri)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // REQUIRED for durable refresh token
    prompt: 'consent',        // REQUIRED to force token refresh
    scope: SCOPES,
    state,                    // CSRF protection
  })

  return { authUrl, oauth2Client }
}
