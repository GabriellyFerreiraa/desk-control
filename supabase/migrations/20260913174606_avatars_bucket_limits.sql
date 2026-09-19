-- Fix: the "avatars" bucket had no server-side file size or MIME type
-- limit, so the client-side check added in Settings.tsx was the only
-- guard against a large or non-image upload — trivially bypassed by
-- calling the storage API directly. Enforce the same limits at the
-- storage layer, which is the control that actually matters.

UPDATE storage.buckets
SET
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
WHERE id = 'avatars';
