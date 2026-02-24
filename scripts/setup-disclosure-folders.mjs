import { config } from 'dotenv'
config({ path: '.env.local' })
import { google } from 'googleapis'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
)
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

const drive = google.drive({ version: 'v3', auth })

const CATEGORIES = [
  'Barangay Budget',
  'Itemized Monthly Collections and Disbursement',
  '20% Component of the IRA Utilization',
  'Annual Procurement Plan or Procurement List',
  'List of Notices and Award',
  'Summary of Income and Expenditure',
]

const YEARS = ['2025', '2026']

async function findFolder(name, parentId) {
  const q = parentId
    ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id, name)' })
  return res.data.files?.[0] || null
}

async function createFolder(name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: 'id, name',
  })
  return res.data
}

async function ensureFolder(name, parentId) {
  const existing = await findFolder(name, parentId)
  if (existing) {
    console.log(`  Found: ${name} (${existing.id})`)
    return existing
  }
  const created = await createFolder(name, parentId)
  console.log(`  Created: ${name} (${created.id})`)
  return created
}

async function main() {
  console.log('=== Setting up Full Disclosure Dashboard folders ===')
  console.log('Structure: Full Disclosure Dashboard / <year> / <category>\n')

  // Find or create parent folder
  let banaderoFolder = await findFolder('Barangay 6 Banadero', null)
  let disclosureFolder

  if (banaderoFolder) {
    console.log(`Found: Barangay 6 Banadero (${banaderoFolder.id})`)
    disclosureFolder = await ensureFolder('Full Disclosure Dashboard', banaderoFolder.id)
  } else {
    disclosureFolder = await findFolder('Full Disclosure Dashboard', null)
    if (disclosureFolder) {
      console.log(`Found: Full Disclosure Dashboard (${disclosureFolder.id})`)
    } else {
      disclosureFolder = await createFolder('Full Disclosure Dashboard')
      console.log(`Created: Full Disclosure Dashboard (${disclosureFolder.id})`)
    }
  }

  // Structure: year -> categories
  const links = []

  for (const category of CATEGORIES) {
    const entry = { title: category.toUpperCase() }

    for (const year of YEARS) {
      console.log(`\n--- ${year} / ${category} ---`)
      const yearFolder = await ensureFolder(year, disclosureFolder.id)
      const categoryFolder = await ensureFolder(category, yearFolder.id)

      const link = `https://drive.google.com/drive/folders/${categoryFolder.id}`
      if (year === '2025') entry.year2025Link = link
      if (year === '2026') entry.year2026Link = link
    }

    links.push(entry)
  }

  // Output for Supabase disclosure_links
  console.log('\n\n=== Paste this into Supabase barangays.disclosure_links ===\n')
  console.log(JSON.stringify(links, null, 2))
}

main().catch(console.error)
