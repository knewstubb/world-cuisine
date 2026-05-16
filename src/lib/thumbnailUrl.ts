/**
 * Constructs a thumbnail URL for a dish photo stored in Supabase Storage.
 *
 * Uses Supabase's image transformation feature to serve a width-constrained
 * version of the original image. Since the `dish-photos` bucket is private,
 * the URL uses the authenticated render endpoint which requires the user's
 * session token (handled automatically by the Supabase client when fetching).
 *
 * @param photoPath - The storage path of the photo (e.g., "household-id/dish-id.jpg")
 * @returns The full thumbnail URL with width=400 transform parameter
 */
export function getThumbnailUrl(photoPath: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return `${supabaseUrl}/storage/v1/render/image/authenticated/dish-photos/${photoPath}?width=400`;
}
