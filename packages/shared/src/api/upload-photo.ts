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
  const base64Data = base64Photo.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

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
