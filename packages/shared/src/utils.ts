import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Normalize a string for use in filenames (uppercase, strip diacritics, hyphenate)
export function normalizeFilename(str: string): string {
  return str.toUpperCase()
    .trim()
    .replace(/\s+/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00d1/g, 'N')
    .replace(/\u00f1/g, 'N')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Build a photo filename from resident name parts
export function buildPhotoFilename(
  lastName: string,
  firstName: string,
  middleName?: string,
  suffix?: string
): string {
  const nameParts = [
    normalizeFilename(lastName),
    normalizeFilename(firstName),
    middleName ? normalizeFilename(middleName) : ''
  ].filter(v => v).join('-')

  return suffix
    ? `${nameParts}-${normalizeFilename(suffix)}.jpg`
    : `${nameParts}.jpg`
}

// Convert string to Sentence Case
export function toSentenceCase(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Parse full name into parts
export function parseFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1], suffix: '' }
  } else if (parts.length === 3) {
    return { firstName: parts[0], middleName: parts[1], lastName: parts[2], suffix: '' }
  } else if (parts.length >= 4) {
    const lastPart = parts[parts.length - 1]
    const suffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V']

    if (suffixes.includes(lastPart.toUpperCase().replace('.', ''))) {
      return {
        firstName: parts[0],
        middleName: parts[1],
        lastName: parts.slice(2, -1).join(' '),
        suffix: lastPart
      }
    }

    return {
      firstName: parts[0],
      middleName: parts[1],
      lastName: parts.slice(2).join(' '),
      suffix: ''
    }
  }

  return { firstName: fullName, middleName: '', lastName: '', suffix: '' }
}
