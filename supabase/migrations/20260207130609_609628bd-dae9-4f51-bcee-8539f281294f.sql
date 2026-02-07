
-- Add new profile fields to merchants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS contact_email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS postcode text DEFAULT '',
  ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '{}';

-- Create storage bucket for merchant logos
INSERT INTO storage.buckets (id, name, public) VALUES ('merchant-logos', 'merchant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for merchant logos
CREATE POLICY "Anyone can view merchant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'merchant-logos');

CREATE POLICY "Merchants can upload own logo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'merchant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Merchants can update own logo"
ON storage.objects FOR UPDATE
USING (bucket_id = 'merchant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Merchants can delete own logo"
ON storage.objects FOR DELETE
USING (bucket_id = 'merchant-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
