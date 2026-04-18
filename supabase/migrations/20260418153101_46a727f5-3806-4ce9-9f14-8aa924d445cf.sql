-- Soft-delete: deleted_at kolommen
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON public.deals (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_merchants_deleted_at ON public.merchants (deleted_at) WHERE deleted_at IS NULL;

-- Update is_merchant_active helper om deleted_at te respecteren
CREATE OR REPLACE FUNCTION public.is_merchant_active(_merchant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchants
    WHERE id = _merchant_id
      AND blocked = false
      AND status = 'active'
      AND deleted_at IS NULL
  )
$$;

-- Deals: anon/authenticated mogen geen soft-deleted deals zien
DROP POLICY IF EXISTS "Anyone can view active deals" ON public.deals;
CREATE POLICY "Anyone can view active deals"
ON public.deals
FOR SELECT
TO anon, authenticated
USING (
  deleted_at IS NULL
  AND expiry_time > now()
  AND public.is_merchant_active(merchant_id)
);

-- Merchants own/owner-view policies updaten zodat deleted_at IS NULL geldt voor non-admin
DROP POLICY IF EXISTS "Anon can view active non-blocked merchants" ON public.merchants;
CREATE POLICY "Anon can view active non-blocked merchants"
ON public.merchants
FOR SELECT
TO anon
USING (blocked = false AND status = 'active' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated can view non-blocked merchants" ON public.merchants;
CREATE POLICY "Authenticated can view non-blocked merchants"
ON public.merchants
FOR SELECT
TO authenticated
USING (blocked = false AND status = 'active' AND deleted_at IS NULL);

-- Merchant eigen profiel mag eigen deleted_at niet zien (anders ziet hij een 'spookprofiel')
DROP POLICY IF EXISTS "Owner can view own merchant row" ON public.merchants;
CREATE POLICY "Owner can view own merchant row"
ON public.merchants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND deleted_at IS NULL);