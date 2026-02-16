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

function sanitize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalize(str) {
  return str.toUpperCase().replace(/\./g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

const SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V'])

async function main() {
  console.log('=== Fix Remaining 15 Unmatched ===\n')

  // Remaining unmatched images
  const remaining = [
    'ANTE-ALAN-ARCOS-SR.jpg',             // Already matched ANTE-ALAN-ARCOS-SR-1, this is original
    'BEATO-JOHN-LLOYD-CHRISTIAN-NACOR-1.jpg', // Alternate photo
    'LORESTO-EMMA-GONZALES-1.jpg',
    'LORESTO-MOISES-BALDO-1.jpg',
    'MAPA-JOSEPHINE-ABACHE-1.jpg',
    'MAPA-JOSEPHINE-ABACHE-2.jpg',
    'MARTINEZ-RACHEL-CARMELA-BALTASAR-1.jpg',
    'MIRANDA-MARK-JAYSON.jpg',            // CSV has "Mark Jayson -" (dash as middle)
    'MONTEVIRGEN-ROEL-ARINGO-1.jpg',
    'MONTEVIRGEN-ROEL-ARINGO-2.jpg',
    'RED-CHONA-GUEVARA-1.jpg',
    'SALAMODING-EMMERENCE-CHARLES.jpg',   // CSV has "Emmerence Charles -"
    'TESORERO-CHERRY-LOI-TANAEL.jpg',     // CSV has "Cherry- Loi"
    'TORREGOZA-JAY-R-REYNOSO.jpg',        // Middle initial "R"
    'TURALDE-MYLA-MOSTAR-1.jpg',
  ]

  // Get all residents for matching
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

  // Build lookup by LASTNAME-FIRSTNAME (partial match)
  const byLastFirst = new Map()
  for (const r of allResidents) {
    const key = sanitize(`${normalize(r.last_name)}-${normalize(r.first_name)}`).toUpperCase()
    if (!byLastFirst.has(key)) byLastFirst.set(key, [])
    byLastFirst.get(key).push(r)
  }

  // Build lookup by LASTNAME-FIRSTNAME-MIDDLENAME
  const byFullName = new Map()
  for (const r of allResidents) {
    let key = sanitize(`${normalize(r.last_name)}-${normalize(r.first_name)}`).toUpperCase()
    if (r.middle_name) key += `-${sanitize(normalize(r.middle_name)).toUpperCase()}`
    if (!byFullName.has(key)) byFullName.set(key, r)
  }

  let uploaded = 0
  let failed = 0
  const stillUnmatched = []

  for (const imgFile of remaining) {
    const sanitizedFile = sanitize(imgFile)
    let name = sanitizedFile.replace(/\.jpg$/i, '').toUpperCase()

    // Strip trailing -1, -2 etc.
    name = name.replace(/-\d+$/, '')

    // Strip trailing suffix (JR, SR, etc.)
    const parts = name.split('-')
    const lastPart = parts[parts.length - 1]
    if (SUFFIXES.has(lastPart)) {
      parts.pop()
      name = parts.join('-')
    }

    // Try full-name match first
    let resident = byFullName.get(name)

    // Try partial (last+first) match
    if (!resident && parts.length >= 2) {
      const shortKey = `${parts[0]}-${parts[1]}`
      const candidates = byLastFirst.get(shortKey) || []
      // Pick the one without photo_url first, then any
      resident = candidates.find(r => !r.photo_url) || candidates[0]
    }

    if (!resident) {
      stillUnmatched.push(imgFile)
      console.log(`  No match: ${imgFile} (tried key: ${name})`)
      continue
    }

    // Upload
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

    // Update photo_url only if resident doesn't have one yet
    if (!resident.photo_url) {
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(sanitizedFile)

      await supabase
        .from('residents')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', resident.id)

      uploaded++
      console.log(`  Linked: ${imgFile} → ${resident.last_name}, ${resident.first_name} ${resident.middle_name || ''}`)
    } else {
      uploaded++
      console.log(`  Uploaded (alt): ${imgFile} → ${resident.last_name}, ${resident.first_name} (already has photo)`)
    }
  }

  console.log(`\n=== Results ===`)
  console.log(`  Uploaded: ${uploaded}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Still unmatched: ${stillUnmatched.length}`)

  // Verification
  const { count: withPhotos } = await supabase
    .from('residents')
    .select('*', { count: 'exact', head: true })
    .eq('barangay_id', BARANGAY_ID)
    .not('photo_url', 'is', null)

  console.log(`\n  Total residents with photo_url: ${withPhotos}`)
}

main().catch(console.error)
