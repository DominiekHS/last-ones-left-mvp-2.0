-- Restrict storage object listing/metadata to owners and admins.
-- Public read of file content still works via the public bucket URL (getPublicUrl),
-- which bypasses RLS on storage.objects.

DROP POLICY IF EXISTS "Anyone can view deal images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view merchant logos" ON storage.objects;

CREATE POLICY "deal_images_select_own_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-images'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "merchant_logos_select_own_or_admin"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'merchant-logos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);