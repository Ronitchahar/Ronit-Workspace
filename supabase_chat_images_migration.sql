-- Run in Supabase SQL Editor to enable cross-device chat image sync
-- Bucket: chat-images (public read, upload for anon/authenticated per your RLS setup)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access
DROP POLICY IF EXISTS "chat_images_public_read" ON storage.objects;
CREATE POLICY "chat_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');

-- Allow uploads (anon key — matches existing app auth pattern)
DROP POLICY IF EXISTS "chat_images_insert" ON storage.objects;
CREATE POLICY "chat_images_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat_images_update" ON storage.objects;
CREATE POLICY "chat_images_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat_images_delete" ON storage.objects;
CREATE POLICY "chat_images_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-images');

-- Optional: structured metadata on chat_history (fallback: encoded in text column)
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS metadata jsonb;
