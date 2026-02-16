import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, readFileSync as readFile } from 'fs'
import { join, resolve } from 'path'
import { config } from 'dotenv'

// Load env from root .env.local
config({ path: resolve(import.meta.dirname, '../.env.local') })

const BARANGAY_ID = '375ff66e-6f48-43d5-add9-cd184c826ad3'
const BUCKET_NAME = 'banadero'
const CSV_PATH = resolve(import.meta.dirname, '../residents_rows.csv')
const IMAGES_DIR = resolve(import.meta.dirname, '../extracted_images')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Suffix extraction ──────────────────────────────────────────────────
const SUFFIX_PATTERNS = /^(Jr\.?|Sr\.?|III|IV|II|V)\s*/i

function extractSuffix(middleName) {
  if (!middleName) return { suffix: null, cleanMiddle: null }
  const match = middleName.match(SUFFIX_PATTERNS)
  if (match) {
    const suffix = match[1].replace(/\.$/, '') // normalize "Jr." → "Jr"
    const cleanMiddle = middleName.slice(match[0].length).trim() || null
    return { suffix, cleanMiddle }
  }
  return { suffix: null, cleanMiddle: middleName }
}

// ── Photo matching ─────────────────────────────────────────────────────
function normalize(str) {
  return str
    .toUpperCase()
    .replace(/\./g, '')       // strip periods (Ma. → MA)
    .replace(/\s+/g, '-')     // spaces → dashes
    .replace(/-+/g, '-')      // collapse multiple dashes
    .trim()
}

// Strip diacritics for Supabase storage keys (ñ→n, ó→o, etc.)
function sanitizeForStorage(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function buildExpectedFilename(lastName, firstName, middleName) {
  let name = `${normalize(lastName)}-${normalize(firstName)}`
  if (middleName) {
    name += `-${normalize(middleName)}`
  }
  return `${name}.jpg`
}

// ── CSV parsing ────────────────────────────────────────────────────────
function parseCSV(csvPath) {
  const raw = readFileSync(csvPath, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())
  const header = lines[0].split(',')

  return lines.slice(1).map(line => {
    const cols = line.split(',')
    const row = {}
    header.forEach((h, i) => { row[h.trim()] = cols[i]?.trim() || '' })
    return row
  })
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('Starting migration...\n')

  // Verify Supabase connection
  const { data: test, error: testErr } = await supabase
    .from('barangays')
    .select('slug')
    .eq('id', BARANGAY_ID)
    .single()

  if (testErr || !test) {
    console.error('Failed to connect to Supabase or barangay not found:', testErr)
    process.exit(1)
  }
  console.log(`Connected to Supabase. Barangay: ${test.slug}\n`)

  // 1. Read image filenames and build lookup map
  const imageFiles = readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith('.jpg'))
  const imageMap = new Map()
  for (const file of imageFiles) {
    imageMap.set(file.toUpperCase(), file) // normalized key → original filename
  }
  console.log(`Found ${imageFiles.length} images in extracted_images/\n`)

  // 2. Create storage bucket (if not exists)
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  })
  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.error('Failed to create bucket:', bucketErr)
    process.exit(1)
  }
  console.log(`Bucket "${BUCKET_NAME}" ready.\n`)

  // 3. Parse CSV
  const rows = parseCSV(CSV_PATH)
  console.log(`Parsed ${rows.length} residents from CSV.\n`)

  // 4. Process each resident
  const residents = []
  let photosMatched = 0
  let photosUploaded = 0
  let photosFailed = 0
  const unmatched = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const { suffix, cleanMiddle } = extractSuffix(row.middle_name || null)

    // Build resident record
    const resident = {
      id: row.id,
      last_name: row.last_name,
      first_name: row.first_name,
      middle_name: cleanMiddle,
      suffix,
      birthdate: row.birthdate || null,
      age: row.age ? parseInt(row.age) : null,
      gender: row.gender || null,
      civil_status: row.civil_status || null,
      citizenship: row.citizenship || 'Filipino',
      purok: row.purok || null,
      barangay_id: BARANGAY_ID,
      photo_url: null,
      created_at: row.created_at || new Date().toISOString(),
    }

    // Try to match photo — use ORIGINAL middle_name (with suffix) for filename matching
    // since image files were named from the same source data
    const expectedFile = buildExpectedFilename(row.last_name, row.first_name, row.middle_name || null)
    const matchedFile = imageMap.get(expectedFile.toUpperCase())

    if (matchedFile) {
      photosMatched++
      // Upload to Supabase storage
      const filePath = join(IMAGES_DIR, matchedFile)
      const fileBuffer = readFile(filePath)

      const storagePath = sanitizeForStorage(matchedFile) // strip diacritics for valid storage key
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadErr) {
        photosFailed++
        if (i < 3) console.error(`  Upload failed for ${matchedFile}:`, uploadErr.message)
      } else {
        photosUploaded++
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath)
        resident.photo_url = urlData.publicUrl
      }
    } else {
      unmatched.push(`${row.last_name}, ${row.first_name} ${row.middle_name || ''} → expected: ${expectedFile}`)
    }

    residents.push(resident)

    // Progress
    if ((i + 1) % 200 === 0) {
      console.log(`  Processed ${i + 1}/${rows.length} residents...`)
    }
  }

  console.log(`\nPhoto matching results:`)
  console.log(`  Matched: ${photosMatched}`)
  console.log(`  Uploaded: ${photosUploaded}`)
  console.log(`  Failed uploads: ${photosFailed}`)
  console.log(`  No match: ${unmatched.length}\n`)

  // 5. Insert residents in batches
  const BATCH_SIZE = 100
  let inserted = 0
  let errors = 0

  for (let i = 0; i < residents.length; i += BATCH_SIZE) {
    const batch = residents.slice(i, i + BATCH_SIZE)
    const { error: insertErr } = await supabase
      .from('residents')
      .upsert(batch, { onConflict: 'id' })

    if (insertErr) {
      errors++
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, insertErr.message)
    } else {
      inserted += batch.length
    }
  }

  console.log(`\nInsert results:`)
  console.log(`  Inserted/updated: ${inserted}`)
  console.log(`  Failed batches: ${errors}\n`)

  // 6. Verification
  const { count } = await supabase
    .from('residents')
    .select('*', { count: 'exact', head: true })
    .eq('barangay_id', BARANGAY_ID)

  const { count: withPhotos } = await supabase
    .from('residents')
    .select('*', { count: 'exact', head: true })
    .eq('barangay_id', BARANGAY_ID)
    .not('photo_url', 'is', null)

  console.log(`Verification:`)
  console.log(`  Total residents in DB for banadero: ${count}`)
  console.log(`  Residents with photo_url: ${withPhotos}\n`)

  // Write unmatched to file for review
  if (unmatched.length > 0) {
    const { writeFileSync } = await import('fs')
    writeFileSync(
      resolve(import.meta.dirname, '../unmatched-photos.txt'),
      unmatched.join('\n'),
      'utf-8'
    )
    console.log(`Wrote ${unmatched.length} unmatched entries to unmatched-photos.txt`)
  }

  console.log('\nMigration complete!')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
