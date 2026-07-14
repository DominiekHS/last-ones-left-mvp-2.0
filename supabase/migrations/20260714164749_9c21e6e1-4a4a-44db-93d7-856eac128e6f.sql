
CREATE POLICY "deal_images_insert_admin"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "deal_images_update_admin"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'deal-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'deal-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "deal_images_delete_admin"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'deal-images'
  AND public.has_role(auth.uid(), 'admin'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
