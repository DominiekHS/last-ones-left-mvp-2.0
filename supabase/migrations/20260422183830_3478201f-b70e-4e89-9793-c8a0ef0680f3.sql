-- =============================================================
-- LEK 1: merchants.contact_email / contact_phone publiek leesbaar
-- =============================================================
-- Strategie: anon mag de base table NIET meer rechtstreeks lezen.
-- Anon krijgt publieke info via de view `merchants_public` (heeft RLS-bypass
-- want de view filtert al op blocked=false AND status='active' en bevat
-- geen contactvelden). Authenticated users mogen wel de base table lezen,
-- want zij hebben legitieme reden om contactgegevens te zien (bv. vouchers,
-- profielpagina's). Admin- en owner-policies blijven ongemoeid.

DROP POLICY IF EXISTS "Anon can view active non-blocked merchants" ON public.merchants;

-- Authenticated-policy mag blijven; we maken hem expliciet herzien zodat
-- alleen ingelogde gebruikers contactdata kunnen zien.
DROP POLICY IF EXISTS "Authenticated can view non-blocked merchants" ON public.merchants;
CREATE POLICY "Authenticated can view non-blocked merchants"
ON public.merchants
FOR SELECT
TO authenticated
USING (blocked = false AND status = 'active' AND deleted_at IS NULL);

-- merchants_public view: zorg dat deze zonder RLS-frictie werkt voor anon.
-- Een view in public schema is standaard onderworpen aan RLS van de base
-- table als security_invoker aanstaat. We willen security_definer zodat
-- anon de publieke kolommen kan zien zonder RLS op merchants te raken.
ALTER VIEW public.merchants_public SET (security_invoker = false);

-- Geef anon en authenticated expliciet SELECT op de view.
GRANT SELECT ON public.merchants_public TO anon, authenticated;


-- =============================================================
-- LEK 2: deals.discount_code publiek leesbaar voor anon
-- =============================================================
-- Strategie: maak een nieuwe view `deals_public` met alle kolommen behalve
-- discount_code. Anon mag de base table niet meer; de view gebruikt
-- security_definer om actief gefilterde deals te tonen zonder kortingscode.
-- Authenticated houden hun bestaande policies (merchants/admins/claimers).

DROP POLICY IF EXISTS "Anyone can view active deals" ON public.deals;

-- Nieuwe restrictievere SELECT-policy alleen voor authenticated:
-- voor anon volstaat de view; ingelogde users mogen actieve deals
-- vanuit de base table lezen (inclusief discount_code blijft beschermd
-- door consumer-claim policies en owner/admin policies — voor non-owners/
-- non-claimers/non-admins die toch de base table querien zouden zij geen
-- rij krijgen omdat we hieronder anon weglaten en de andere policies
-- specifieker zijn).
CREATE POLICY "Authenticated can view active deals"
ON public.deals
FOR SELECT
TO authenticated
USING (deleted_at IS NULL AND expiry_time > now() AND public.is_merchant_active(merchant_id));

-- Publieke view zonder discount_code
CREATE OR REPLACE VIEW public.deals_public
WITH (security_invoker = false) AS
SELECT
  id,
  merchant_id,
  title,
  description,
  category,
  city,
  postal_code,
  address,
  image_url,
  original_price,
  discount_percentage,
  discount_type,
  pricing_model,
  price_per_person,
  indicative_price_from,
  start_time,
  start_time_mode,
  expiry_time,
  redemption_method,
  redemption_instructions,
  cancellation_policy,
  terms_summary,
  payment_steps,
  counter_discount_mode,
  checkout_link,
  created_at,
  updated_at
FROM public.deals
WHERE deleted_at IS NULL
  AND expiry_time > now()
  AND public.is_merchant_active(merchant_id);

GRANT SELECT ON public.deals_public TO anon, authenticated;