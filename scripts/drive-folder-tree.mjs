import 'dotenv/config'
import { google } from 'googleapis'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
)
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const drive = google.drive({ version: 'v3', auth })

// Fetch all folders with their parents
const folders = []
let pageToken = undefined

do {
  const res = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'nextPageToken, files(id, name, parents)',
    pageSize: 100,
    pageToken,
  })
  folders.push(...(res.data.files || []))
  pageToken = res.data.nextPageToken
} while (pageToken)

// Build lookup
const byId = Object.fromEntries(folders.map(f => [f.id, f]))

// Find children of each folder
const children = {}
for (const f of folders) {
  const parentId = f.parents?.[0]
  if (!children[parentId]) children[parentId] = []
  children[parentId].push(f)
}

// Print tree
function printTree(id, indent = '') {
  const kids = (children[id] || []).sort((a, b) => a.name.localeCompare(b.name))
  for (let i = 0; i < kids.length; i++) {
    const isLast = i === kids.length - 1
    const prefix = isLast ? '└── ' : '├── '
    const childIndent = isLast ? '    ' : '│   '
    console.log(`${indent}${prefix}${kids[i].name}`)
    printTree(kids[i].id, indent + childIndent)
  }
}

// Find root folders (parent not in our folder set)
const knownIds = new Set(folders.map(f => f.id))
const roots = folders.filter(f => !f.parents?.[0] || !knownIds.has(f.parents[0]))

for (const root of roots.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(root.name)
  printTree(root.id)
}
