import { buildPhotoFilename } from '../utils'

interface UploadPhotoParams {
  base64Photo: string
  lastName: string
  firstName: string
  middleName?: string
  suffix?: string
  bucket: string
  supabase: { storage: { from: (bucket: string) => { upload: (path: string, data: Buffer, options: Record<string, unknown>) => Promise<{ data: { path: string } | null; error: Error | null }>; getPublicUrl: (path: string) => { data: { publicUrl: string } } } } }
}

/**
 * Decode a base64 photo, build a normalized filename, and upload to Supabase Storage.
 * Returns the public URL of the uploaded photo.
 */
export async function uploadResidentPhoto({
  base64Photo,
  lastName,
  firstName,
  middleName,
  suffix,
  bucket,
  supabase,
}: UploadPhotoParams): Promise<string> {
  // Validate base64 data URI format (image/* MIME types only)
  if (!base64Photo || !base64Photo.startsWith('data:image/')) {
    throw new Error('Invalid photo: must be a base64 data URI with an image MIME type')
  }

  const base64Data = base64Photo.replace(/^data:image\/\w+;base64,/, '')

  // Reject if nothing left after stripping prefix, or contains non-base64 chars
  if (!base64Data || !/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    throw new Error('Invalid photo: malformed base64 data')
  }

  const buffer = Buffer.from(base64Data, 'base64')

  // Reject unreasonably large photos (10 MB)
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Photo too large: maximum 10 MB')
  }

  const filename = buildPhotoFilename(lastName, firstName, middleName, suffix)

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    throw uploadError
  }

  // Return the public URL (not just the path)
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData!.path)
  return urlData.publicUrl
}
