import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { config } from 'dotenv'

config({ path: resolve(import.meta.dirname, '../.env.local') })

const BARANGAY_ID = '375ff66e-6f48-43d5-add9-cd184c826ad3'
const BUCKET_NAME = 'banadero'
const IMAGES_DIR = resolve(import.meta.dirname, '../extracted_images')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Strip diacritics for storage keys and matching
function sanitize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalize(str) {
  return str
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const SUFFIXES = ['JR', 'SR', 'II', 'III', 'IV', 'V']

/**
 * Parse an image filename into parts for flexible matching.
 * Format: LASTNAME-FIRSTNAME[-MIDDLE...].jpg
 * Returns { lastName, firstName, rest[] } where rest includes middle name parts and possibly suffix.
 */
function parseImageFilename(filename) {
  const name = filename.replace(/\.jpg$/i, '')
  const parts = name.split('-').filter(Boolean)
  if (parts.length < 2) return null
  return {
    lastName: parts[0],
    firstName: parts[1],
    rest: parts.slice(2),
    raw: parts,
  }
}

/**
 * Generate all possible filename permutations for a resident,
 * trying suffix at both start and end of middle name parts.
 */
function buildCandidateFilenames(lastName, firstName, middleName, suffix) {
  const candidates = []
  const ln = normalize(lastName)
  const fn = normalize(firstName)

  // Base: no middle, no suffix
  candidates.push(`${ln}-${fn}.jpg`)

  // With just middle (no suffix)
  if (middleName) {
    const mn = normalize(middleName)
    candidates.push(`${ln}-${fn}-${mn}.jpg`)
  }

  // With just suffix (no middle)
  if (suffix) {
    const sf = normalize(suffix)
    candidates.push(`${ln}-${fn}-${sf}.jpg`)
  }

  // With suffix + middle: suffix FIRST (how CSV stores it)
  if (suffix && middleName) {
    const sf = normalize(suffix)
    const mn = normalize(middleName)
    candidates.push(`${ln}-${fn}-${sf}-${mn}.jpg`)
    // Suffix LAST (how image files may be named)
    candidates.push(`${ln}-${fn}-${mn}-${sf}.jpg`)
  }

  // Also try the raw middle_name as-is (before suffix extraction)
  // e.g., "Jr. Cemitara" → "JR-CEMITARA"
  if (suffix && middleName) {
    const rawMiddle = normalize(`${suffix}. ${middleName}`)
    candidates.push(`${ln}-${fn}-${rawMiddle}.jpg`)
    const rawMiddle2 = normalize(`${suffix} ${middleName}`)
    candidates.push(`${ln}-${fn}-${rawMiddle2}.jpg`)
  }

  // Deduplicate
  return [...new Set(candidates)]
}

async function main() {
  console.log('=== Fix Unmatched Photos ===\n')

  // 1. Get all image files
  const imageFiles = readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith('.jpg'))
  console.log(`Total image files: ${imageFiles.length}`)

  // 2. List what's already in the bucket
  const existingInBucket = new Set()
  let page = 0
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1000, offset: page * 1000 })
    if (error) { console.error('Error listing bucket:', error); break }
    if (data.length === 0) break
    for (const f of data) existingInBucket.add(f.name.toUpperCase())
    page++
  }
  console.log(`Already in bucket: ${existingInBucket.size}`)

  // 3. Find images NOT in bucket (sanitized)
  const notInBucket = imageFiles.filter(f => {
    const sanitized = sanitize(f).toUpperCase()
    return !existingInBucket.has(sanitized)
  })
  console.log(`Images NOT yet in bucket: ${notInBucket.length}\n`)

  // 4. Get all residents WITHOUT photo_url
  const { data: residentsNoPhoto, error: resErr } = await supabase
    .from('residents')
    .select('id, first_name, middle_name, last_name, suffix')
    .eq('barangay_id', BARANGAY_ID)
    .is('photo_url', null)

  if (resErr) {
    console.error('Error fetching residents:', resErr)
    return
  }
  console.log(`Residents without photo_url: ${residentsNoPhoto.length}\n`)

  // 5. Build a reverse lookup: for each resident, generate all candidate filenames
  //    Map: normalized filename → resident
  const residentByFilename = new Map()
  for (const r of residentsNoPhoto) {
    const candidates = buildCandidateFilenames(
      r.last_name,
      r.first_name,
      r.middle_name,
      r.suffix
    )
    for (const c of candidates) {
      // Store with sanitized + uppercase key for matching
      const key = sanitize(c).toUpperCase()
      if (!residentByFilename.has(key)) {
        residentByFilename.set(key, r)
      }
    }
  }

  // 6. Try to match each unmatched image to a resident
  let matched = 0
  let uploaded = 0
  let failed = 0
  const stillUnmatched = []

  // Process ALL image files (not just those not in bucket) to find resident matches
  // for images that are in bucket but resident has no photo_url
  for (const imgFile of imageFiles) {
    const sanitizedFile = sanitize(imgFile)
    const key = sanitizedFile.toUpperCase()

    const resident = residentByFilename.get(key)
    if (!resident) continue // no matching resident

    // This image matches a resident without photo_url
    matched++

    // Check if already in bucket
    if (existingInBucket.has(key)) {
      // Already uploaded, just need to update resident record
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(sanitizedFile)

      const { error: updateErr } = await supabase
        .from('residents')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', resident.id)

      if (updateErr) {
        console.error(`  Failed to update ${resident.last_name}: ${updateErr.message}`)
        failed++
      } else {
        uploaded++
        console.log(`  Linked (already in bucket): ${imgFile} → ${resident.last_name}, ${resident.first_name}`)
      }
    } else {
      // Need to upload and update
      const filePath = join(IMAGES_DIR, imgFile)
      const fileBuffer = readFileSync(filePath)

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(sanitizedFile, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadErr) {
        console.error(`  Upload failed for ${imgFile}: ${uploadErr.message}`)
        failed++
        continue
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(sanitizedFile)

      const { error: updateErr } = await supabase
        .from('residents')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', resident.id)

      if (updateErr) {
        console.error(`  Failed to update ${resident.last_name}: ${updateErr.message}`)
        failed++
      } else {
        uploaded++
        console.log(`  Uploaded & linked: ${imgFile} → ${resident.last_name}, ${resident.first_name}`)
      }
    }

    // Remove resident from map to avoid double-matching
    for (const [k, v] of residentByFilename) {
      if (v.id === resident.id) residentByFilename.delete(k)
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`  Images matched to residents: ${matched}`)
  console.log(`  Successfully uploaded/linked: ${uploaded}`)
  console.log(`  Failed: ${failed}`)

  // Verification
  const { count: withPhotos } = await supabase
    .from('residents')
    .select('*', { count: 'exact', head: true })
    .eq('barangay_id', BARANGAY_ID)
    .not('photo_url', 'is', null)

  console.log(`\n  Total residents with photo_url now: ${withPhotos}`)
  console.log('\nDone!')
}

main().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
