import { getSupabaseAdmin } from './supabase'

export interface BarangayConfig {
  id: string
  slug: string
  domain: string
  name: string
  full_name: string
  city: string
  province: string
  phone: string | null
  email: string | null
  primary_color: string
  tagline: string
  mission: string | null
  vision: string | null

  // Content (JSON blobs)
  officials: Array<{ name: string; position: string; image: string }>
  services: Array<{ id: number; title: string; description: string; icon: string }>
  contacts: Array<{ id: number; name: string; number: string }>
  office_hours: Array<{ id: number; day: string; hours: string; is_closed: boolean }>
  projects: Record<string, any[]>
  disclosure_links: Array<{ title: string; year2025Link?: string; year2026Link?: string }>
  google_form_urls: Record<string, string>

  // Admin
  admin_password_hash: string | null
}

// In-memory cache with TTL
const cache = new Map<string, { config: BarangayConfig; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getBarangayConfig(host: string): Promise<BarangayConfig | null> {
  // Check for BARANGAY_SLUG env override (useful for monorepo local dev)
  const slugOverride = process.env.BARANGAY_SLUG
  if (slugOverride) {
    const cached = cache.get(slugOverride)
    if (cached && cached.expires > Date.now()) {
      return cached.config
    }

    const { data, error } = await getSupabaseAdmin()
      .from('barangays')
      .select('*')
      .eq('slug', slugOverride)
      .eq('is_active', true)
      .single()

    if (!error && data) {
      cache.set(slugOverride, { config: data, expires: Date.now() + CACHE_TTL })
      return data
    }
  }

  // Strip www. prefix, port, and non-hostname characters
  const cleanDomain = host.replace(/^www\./, '').split(':')[0].replace(/[^a-zA-Z0-9.-]/g, '')
  if (!cleanDomain) return null

  // Check cache
  const cached = cache.get(cleanDomain)
  if (cached && cached.expires > Date.now()) {
    return cached.config
  }

  // Fetch from Supabase by exact domain match
  const { data, error } = await getSupabaseAdmin()
    .from('barangays')
    .select('*')
    .eq('domain', cleanDomain)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    // Fallback for localhost dev only
    if (cleanDomain === 'localhost' || cleanDomain.startsWith('127.')) {
      const { data: slugData, error: slugError } = await getSupabaseAdmin()
        .from('barangays')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (slugError || !slugData) return null

      cache.set(cleanDomain, { config: slugData, expires: Date.now() + CACHE_TTL })
      return slugData
    }
    return null
  }

  cache.set(cleanDomain, { config: data, expires: Date.now() + CACHE_TTL })
  return data
}

// Clear cache (useful after config updates)
export function clearConfigCache(domain?: string) {
  if (domain) {
    cache.delete(domain)
  } else {
    cache.clear()
  }
}
