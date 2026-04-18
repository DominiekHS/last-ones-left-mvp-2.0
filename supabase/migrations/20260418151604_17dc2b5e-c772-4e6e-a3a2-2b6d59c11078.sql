-- Storage hardening #9: write-policies strakker (authenticated + merchant-rol)
-- Beide buckets blijven PUBLIC READ (deal images en logos worden in <img> getoond).
-- Write-acties (INSERT/UPDATE/DELETE) worden beperkt tot:
--  • role = authenticated (anon mag niet eens proberen)
--  • merchant-rol vereist
--  • pad-prefix moet matchen met auth.uid() (bestaande ownership check blijft)

-- 1) Drop oude write-policies
DROP POLICY IF EXISTS "Merchants can upload deal images to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can update own deal images" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can delete own deal images" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can upload own logo" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can update own logo" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can delete own logo" ON storage.objects;

-- 2) Nieuwe write-policies — deal-images
CREATE POLICY "deal_images_insert_own_merchant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deal-images'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "deal_images_update_own_merchant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'deal-images'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'deal-images'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "deal_images_delete_own_merchant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'deal-images'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 3) Nieuwe write-policies — merchant-logos
CREATE POLICY "merchant_logos_insert_own_merchant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'merchant-logos'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "merchant_logos_update_own_merchant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'merchant-logos'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'merchant-logos'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "merchant_logos_delete_own_merchant"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'merchant-logos'
  AND has_role(auth.uid(), 'merchant'::app_role)
  AND (auth.uid())::text = (storage.foldername(name))[1]
);