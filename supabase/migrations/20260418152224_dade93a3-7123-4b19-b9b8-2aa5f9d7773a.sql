-- Fix: anon kan deals niet meer zien sinds de merchants RLS strakker werd.
-- Het EXISTS in de deals-policy past RLS van merchants toe vanuit de anon-context,
-- en merchants heeft geen anon-SELECT policy → EXISTS = false → 0 deals.
--
-- Oplossing: SECURITY DEFINER helper die de merchant-status checkt zonder
-- door RLS te gaan. Daarmee blijft de merchants-tabel zelf volledig dicht
-- voor anon (contact_email/phone lekken niet), maar de deals-policy werkt weer.

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
  )
$$;

-- Vervang de bestaande policy
DROP POLICY IF EXISTS "Anyone can view active deals" ON public.deals;

CREATE POLICY "Anyone can view active deals"
ON public.deals
FOR SELECT
TO anon, authenticated
USING (
  expiry_time > now()
  AND public.is_merchant_active(merchant_id)
);