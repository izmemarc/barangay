import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, writeFileSync } from 'fs'
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

function sanitize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalize(str) {
  return str.toUpperCase().replace(/\./g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

const SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V'])

/**
 * Parse an image filename and generate matching keys by stripping
 * suffixes and duplicate markers from the end.
 *
 * E.g., ADIQUE-JESUS-CEMITARA-JR.jpg → ADIQUE-JESUS-CEMITARA
 *       ANTE-ALAN-ARCOS-SR-1.jpg → ANTE-ALAN-ARCOS
 */
function generateMatchKeys(filename) {
  let name = filename.replace(/\.jpg$/i, '').toUpperCase()
  const keys = [name] // original

  // Strip trailing duplicate marker (-1, -2, etc.)
  const dupMatch = name.match(/^(.+)-(\d+)$/)
  if (dupMatch) {
    name = dupMatch[1]
    keys.push(name)
  }

  // Strip trailing suffix
  const parts = name.split('-')
  if (parts.length >= 3) {
    const last = parts[parts.length - 1]
    if (SUFFIXES.has(last)) {
      const withoutSuffix = parts.slice(0, -1).join('-')
      keys.push(withoutSuffix)
    }
  }

  return [...new Set(keys)]
}

async function main() {
  console.log('=== Fix Unmatched Photos v2 ===\n')

  // 1. Get what's in bucket already
  const existingInBucket = new Set()
  let page = 0
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1000, offset: page * 1000 })
    if (error || data.length === 0) break
    for (const f of data) existingInBucket.add(f.name.toUpperCase())
    page++
  }

  // 2. Get all image files NOT in bucket
  const imageFiles = readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith('.jpg'))
  const unmatched = imageFiles.filter(f => !existingInBucket.has(sanitize(f).toUpperCase()))
  console.log(`Unmatched images to process: ${unmatched.length}\n`)

  // 3. Get ALL residents (with and without photos) for matching
  const allResidents = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, suffix, photo_url')
      .eq('barangay_id', BARANGAY_ID)
      .range(offset, offset + 999)
    if (error || data.length === 0) break
    allResidents.push(...data)
    offset += data.length
    if (data.length < 1000) break
  }
  console.log(`Total residents: ${allResidents.length}`)
  const noPhoto = allResidents.filter(r => !r.photo_url)
  console.log(`Residents without photo: ${noPhoto.length}\n`)

  // 4. Build lookup: LASTNAME-FIRSTNAME-MIDDLENAME (no suffix) → resident
  const residentLookup = new Map()
  for (const r of noPhoto) {
    // Key: LASTNAME-FIRSTNAME-MIDDLENAME (cleaned, no suffix)
    let key = `${normalize(r.last_name)}-${normalize(r.first_name)}`
    if (r.middle_name) key += `-${normalize(r.middle_name)}`
    const sanitizedKey = sanitize(key).toUpperCase()
    if (!residentLookup.has(sanitizedKey)) {
      residentLookup.set(sanitizedKey, r)
    }

    // Also store LASTNAME-FIRSTNAME only for fallback
    const shortKey = sanitize(`${normalize(r.last_name)}-${normalize(r.first_name)}`).toUpperCase()
    if (!residentLookup.has(`SHORT:${shortKey}`)) {
      residentLookup.set(`SHORT:${shortKey}`, r)
    }
  }

  // 5. Process each unmatched image
  let uploaded = 0
  let failed = 0
  let noMatch = 0
  const stillUnmatched = []

  for (const imgFile of unmatched) {
    const sanitizedFile = sanitize(imgFile)
    const matchKeys = generateMatchKeys(sanitizedFile)

    let resident = null
    let matchedBy = ''

    // Try each generated key against the lookup
    for (const key of matchKeys) {
      if (residentLookup.has(key)) {
        resident = residentLookup.get(key)
        matchedBy = `exact: ${key}`
        break
      }
    }

    // Fallback: try SHORT (just lastname-firstname) match for duplicate images
    if (!resident) {
      const parts = sanitize(imgFile).replace(/\.jpg$/i, '').toUpperCase().split('-')
      if (parts.length >= 2) {
        const shortKey = `SHORT:${parts[0]}-${parts[1]}`
        // Only use short match for duplicates (-1, -2) or suffix-only differences
        const isDuplicate = /\-\d+\.jpg$/i.test(imgFile)
        if (isDuplicate && residentLookup.has(shortKey)) {
          resident = residentLookup.get(shortKey)
          matchedBy = `short: ${shortKey}`
        }
      }
    }

    if (!resident) {
      noMatch++
      stillUnmatched.push(imgFile)
      continue
    }

    // Upload to bucket
    const filePath = join(IMAGES_DIR, imgFile)
    const fileBuffer = readFileSync(filePath)

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(sanitizedFile, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (uploadErr) {
      console.error(`  Upload failed: ${imgFile} — ${uploadErr.message}`)
      failed++
      continue
    }

    // Only update photo_url if resident doesn't already have one
    if (!resident.photo_url) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(sanitizedFile)

      const { error: updateErr } = await supabase
        .from('residents')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', resident.id)

      if (updateErr) {
        console.error(`  DB update failed: ${resident.last_name} — ${updateErr.message}`)
        failed++
      } else {
        uploaded++
        console.log(`  OK: ${imgFile} → ${resident.last_name}, ${resident.first_name} (${matchedBy})`)
      }
    } else {
      // Resident already has a photo, just upload the alternate to bucket
      uploaded++
      console.log(`  Uploaded (alt photo): ${imgFile} → ${resident.last_name}, ${resident.first_name}`)
    }

    // Remove resident from lookup to prevent double-matching
    for (const [k, v] of residentLookup) {
      if (v.id === resident.id) residentLookup.delete(k)
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`  Uploaded/linked: ${uploaded}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Still unmatched: ${noMatch}`)

  if (stillUnmatched.length > 0) {
    console.log(`\n  Still unmatched images:`)
    for (const f of stillUnmatched) console.log(`    ${f}`)
  }

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
