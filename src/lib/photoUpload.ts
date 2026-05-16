import { supabase } from './supabase';

const BUCKET_NAME = 'dish-photos';

/**
 * Maps MIME types to file extensions for storage paths.
 */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Uploads a photo to Supabase Storage for a dish entry.
 *
 * @param file - The image file to upload (must be JPEG, PNG, or WebP)
 * @param householdId - The household ID (used as folder prefix)
 * @param dishEntryId - The dish entry ID (used as filename)
 * @returns The storage path string (e.g., "household-id/dish-id.jpg")
 * @throws Error with a descriptive message if the upload fails
 */
export async function uploadPhoto(
  file: File,
  householdId: string,
  dishEntryId: string
): Promise<string> {
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    throw new Error(
      `Unsupported file type "${file.type}". Accepted formats: JPEG, PNG, WebP.`
    );
  }

  const storagePath = `${householdId}/${dishEntryId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  return storagePath;
}
