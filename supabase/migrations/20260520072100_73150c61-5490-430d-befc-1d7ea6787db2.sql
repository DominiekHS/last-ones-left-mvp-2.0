-- Beperk leesrecht op deals.discount_code voor ingelogde gebruikers.
-- Anon was al gerevoked in 20260422183901. Nu doen we hetzelfde voor authenticated:
-- de kolom blijft alleen leesbaar via de SECURITY DEFINER RPC's
-- (claim_deal voor consumenten, get_my_deal_code voor de eigenaar/admin).
-- INSERT/UPDATE rechten blijven onaangetast zodat merchants hun deal kunnen aanmaken/bijwerken.

REVOKE SELECT ON public.deals FROM authenticated;
GRANT SELECT (
  id, merchant_id, title, description, category, city, postal_code, address,
  image_url, original_price, discount_percentage, discount_type,
  pricing_model, price_per_person, indicative_price_from,
  start_time, start_time_mode, expiry_time,
  redemption_method, redemption_instructions, cancellation_policy,
  terms_summary, payment_steps, counter_discount_mode, checkout_link,
  notification_sent_at, deleted_at, created_at, updated_at
) ON public.deals TO authenticated;

-- RPC: lever de kortingscode van een deal alleen aan de eigenaar of een admin.
CREATE OR REPLACE FUNCTION public.get_my_deal_code(p_deal_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    public.is_deal_owner(auth.uid(), p_deal_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT discount_code INTO v_code FROM public.deals WHERE id = p_deal_id;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_deal_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_deal_code(uuid) TO authenticated;