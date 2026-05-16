-- Migration: Configure Supabase Storage bucket for dish photos
-- Requirements: 7.1 (cloud storage for household photos), 7.7 (restrict access to household members)

-- =============================================================================
-- Create the dish-photos bucket (private, 10MB file size limit)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('dish-photos', 'dish-photos', false, 10485760); -- 10MB in bytes

-- =============================================================================
-- Storage RLS Policies
-- =============================================================================

-- Allow authenticated household members to upload photos to their household folder
CREATE POLICY "Household members can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated household members to read photos from their household folder
CREATE POLICY "Household members can read photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated household members to update photos in their household folder
CREATE POLICY "Household members can update photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Allow authenticated household members to delete photos from their household folder
CREATE POLICY "Household members can delete photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT household_id::text FROM household_members WHERE user_id = auth.uid()
    )
  );
