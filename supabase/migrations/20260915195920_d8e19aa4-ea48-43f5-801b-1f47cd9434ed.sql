ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cta_label text;
GRANT SELECT (cta_label), INSERT (cta_label), UPDATE (cta_label) ON public.deals TO authenticated;
GRANT SELECT (cta_label) ON public.deals TO anon;