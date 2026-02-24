import 'dotenv/config'
import { google } from 'googleapis'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
)
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const drive = google.drive({ version: 'v3', auth })

let pageToken = undefined
console.log('ID\t\t\t\t\t\tName')
console.log('-'.repeat(80))

do {
  const res = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'nextPageToken, files(id, name)',
    pageSize: 100,
    pageToken,
  })

  for (const f of res.data.files || []) {
    console.log(`${f.id}\t${f.name}`)
  }

  pageToken = res.data.nextPageToken
} while (pageToken)
