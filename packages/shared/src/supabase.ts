import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for clearance submissions
export type ClearanceType =
  | 'barangay'
  | 'business'
  | 'blotter'
  | 'facility'
  | 'good-moral'
  | 'indigency'
  | 'residency'
  | 'barangay-id'
  | 'cso-accreditation'
  | 'luntian'

export interface ClearanceSubmission {
  id?: string
  clearance_type: ClearanceType
  name: string
  form_data: Record<string, any>
  status: 'pending' | 'processing' | 'approved' | 'rejected'
  created_at?: string
  updated_at?: string
  barangay_id?: string
}

export interface Resident {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  birthdate: string | null
  age: number | null
  gender: string | null
  civil_status: string | null
  citizenship: string
  purok: string | null
  contact: string | null
  photo_url: string | null
  barangay_id: string | null
}

// Submit a clearance form
export async function submitClearance(
  clearanceType: ClearanceType,
  name: string,
  formData: Record<string, any>,
  residentId?: string | null,
  barangayId?: string
) {
  console.log('[Supabase] Inserting submission:', {
    clearanceType,
    name,
    residentId,
    barangayId,
    formData
  })

  const insertData: Record<string, any> = {
    clearance_type: clearanceType,
    name: name,
    form_data: formData,
    resident_id: residentId || null,
    status: 'pending'
  }
  if (barangayId) insertData.barangay_id = barangayId

  const { data, error } = await supabase
    .from('clearance_submissions')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[Supabase] Insert error:', error)
    throw error
  }

  console.log('[Supabase] Insert success:', data)
  return data
}

// Search residents by name, filtered by barangay
export async function searchResidents(query: string, barangayId?: string, limit = 10) {
  if (!query || query.length < 2) return []

  const searchTerm = query.trim().toLowerCase()
  const terms = searchTerm.split(/\s+/)

  // Escape special Supabase filter chars (commas, dots, parens) to prevent filter injection
  const safeTerm = terms[0].replace(/[,.*()\\%_]/g, '')
  if (!safeTerm) return []

  // Get candidates from database
  let queryBuilder = supabase
    .from('residents')
    .select('id, first_name, middle_name, last_name, purok, birthdate, photo_url')
    .or(`first_name.ilike.%${safeTerm}%,last_name.ilike.%${safeTerm}%,middle_name.ilike.%${safeTerm}%`)
    .limit(100)

  if (barangayId) {
    queryBuilder = queryBuilder.eq('barangay_id', barangayId)
  }

  const { data, error } = await queryBuilder

  if (error) {
    console.error('Error searching residents:', error)
    return []
  }

  if (!data) return []

  // Flexible matching: all terms must exist in full name (any order)
  const results = data.filter(resident => {
    const first = resident.first_name.toLowerCase()
    const middle = (resident.middle_name || '').toLowerCase()
    const last = resident.last_name.toLowerCase()
    const fullName = `${first} ${middle} ${last}`.trim()

    if (terms.length === 1) {
      // Single term: match start of any name part
      return first.startsWith(terms[0]) ||
             last.startsWith(terms[0]) ||
             middle.startsWith(terms[0])
    }

    // Multiple terms: all must exist in full name (any order)
    return terms.every(term => fullName.includes(term))
  })

  return results.slice(0, limit)
}

// Calculate age from birthdate
export function calculateAge(birthdate: string | null): number | null {
  if (!birthdate) return null

  const today = new Date()
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

// Cached admin client (service role) — same pattern as barangay-config.ts
// Cast to `any` since we don't have generated Supabase DB types
let supabaseAdmin: any = null
export function getSupabaseAdmin(): any {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabaseAdmin
}
