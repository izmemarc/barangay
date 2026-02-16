import { createClient } from '@supabase/supabase-js'
import { readdirSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'

config({ path: resolve(import.meta.dirname, '../.env.local') })

const BUCKET_NAME = 'banadero'
const BARANGAY_ID = '375ff66e-6f48-43d5-add9-cd184c826ad3'
const IMAGES_DIR = resolve(import.meta.dirname, '../extracted_images')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function sanitize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

async function main() {
  // Get all image files
  const imageFiles = readdirSync(IMAGES_DIR).filter(f => f.toLowerCase().endsWith('.jpg'))

  // Get everything in bucket
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

  // Find image files NOT in bucket
  const notInBucket = imageFiles.filter(f => {
    const sanitized = sanitize(f).toUpperCase()
    return !existingInBucket.has(sanitized)
  })

  console.log(`Images NOT in bucket: ${notInBucket.length}\n`)
  for (const f of notInBucket) {
    console.log(`  ${f}`)
  }

  // Also check: images IN bucket but no resident has matching photo_url
  const { data: residents } = await supabase
    .from('residents')
    .select('id, first_name, middle_name, last_name, suffix, photo_url')
    .eq('barangay_id', BARANGAY_ID)
    .not('photo_url', 'is', null)

  const usedUrls = new Set(residents.map(r => {
    // Extract filename from URL
    const url = r.photo_url
    const parts = url.split('/')
    return parts[parts.length - 1].toUpperCase()
  }))

  console.log(`\nBucket files: ${existingInBucket.size}`)
  console.log(`Resident photo URLs: ${usedUrls.size}`)

  // Write remaining unmatched to file
  writeFileSync(
    resolve(import.meta.dirname, '../remaining-unmatched.txt'),
    notInBucket.join('\n'),
    'utf-8'
  )
}

main().catch(console.error)
