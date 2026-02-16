// Client-safe exports (can be used in both server and client components)

// Supabase
export { supabase, getSupabaseAdmin, submitClearance, searchResidents, calculateAge } from './supabase'
export type { ClearanceType, ClearanceSubmission, Resident } from './supabase'

// Barangay Config
export { getBarangayConfig, clearConfigCache } from './barangay-config'
export type { BarangayConfig } from './barangay-config'

// Utils
export { cn, getOrdinal, toSentenceCase, parseFullName, normalizeFilename, buildPhotoFilename } from './utils'

// NOTE: Server-only modules (googleapis, philsms) are NOT re-exported here
// to avoid pulling Node.js-only dependencies into client bundles.
// Import them directly:
//   import { ... } from '@barangay/shared/google-docs'
//   import { ... } from '@barangay/shared/philsms'
