
-- 1. Add teaser columns to deals
ALTER TABLE public.deals
  ADD COLUMN is_teaser boolean NOT NULL DEFAULT false,
  ADD COLUMN teaser_body text,
  ADD COLUMN teaser_cta_label text,
  ADD COLUMN teaser_cta_url text,
  ADD COLUMN always_show boolean NOT NULL DEFAULT false;

-- Index voor de auto-verberg lookup
CREATE INDEX IF NOT EXISTS deals_teaser_lookup
  ON public.deals (is_teaser, category, lower(city))
  WHERE deleted_at IS NULL;

-- 2. Rebuild deals_public view met nieuwe kolommen
DROP VIEW IF EXISTS public.deals_public;
CREATE VIEW public.deals_public
WITH (security_invoker = true)
AS
SELECT id, merchant_id, title, description, category, city, postal_code,
       address, image_url, original_price, discount_percentage, discount_type,
       pricing_model, price_per_person, indicative_price_from, start_time,
       start_time_mode, expiry_time, redemption_method, redemption_instructions,
       cancellation_policy, terms_summary, payment_steps, counter_discount_mode,
       checkout_link, created_at, updated_at,
       is_teaser, teaser_body, teaser_cta_label, teaser_cta_url, always_show
FROM public.deals
WHERE deleted_at IS NULL
  AND expiry_time > now()
  AND public.is_merchant_active(merchant_id);

GRANT SELECT ON public.deals_public TO anon, authenticated;

-- 3. RLS: admins mogen teasers insert/update/delete
CREATE POLICY "Admins can insert teasers"
ON public.deals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND is_teaser = true
);

CREATE POLICY "Admins can update any deal"
ON public.deals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. claim_deal RPC uitbreiden zodat teasers geweigerd worden
CREATE OR REPLACE FUNCTION public.claim_deal(p_user_id uuid, p_deal_id uuid)
 RETURNS TABLE(voucher_id uuid, discount_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deal RECORD;
  v_code text;
  v_voucher_id uuid;
  v_existing_code text;
  v_remaining int;
  v_merchant_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim on behalf of another user';
  END IF;

  IF NOT has_role(p_user_id, 'consumer') THEN
    RAISE EXCEPTION 'Only consumers can claim deals';
  END IF;

  SELECT v.discount_code INTO v_existing_code
  FROM vouchers v
  WHERE v.user_id = p_user_id AND v.deal_id = p_deal_id AND v.deleted_at IS NULL AND v.status NOT IN ('archived');

  IF FOUND THEN
    RAISE EXCEPTION 'Deal already claimed';
  END IF;

  SELECT d.discount_type, d.discount_code AS deal_code, d.expiry_time, d.title, d.city, d.start_time,
         d.discount_percentage, d.original_price, d.pricing_model, d.price_per_person, d.is_teaser
  INTO v_deal
  FROM deals d
  WHERE d.id = p_deal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF v_deal.is_teaser THEN
    RAISE EXCEPTION 'Cannot claim teaser advertisement';
  END IF;

  IF v_deal.expiry_time < now() THEN
    RAISE EXCEPTION 'Deal has expired';
  END IF;

  SELECT m.company_name INTO v_merchant_name
  FROM merchants m
  JOIN deals d ON d.merchant_id = m.id
  WHERE d.id = p_deal_id;

  IF v_deal.discount_type = 'unique' THEN
    UPDATE unique_codes uc
    SET status = 'assigned', assigned_to_user_id = p_user_id, assigned_at = now()
    WHERE uc.id = (
      SELECT uc2.id FROM unique_codes uc2
      WHERE uc2.deal_id = p_deal_id AND uc2.status = 'available'
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING uc.code INTO v_code;

    IF v_code IS NULL THEN
      RAISE EXCEPTION 'No codes available for this deal';
    END IF;

    SELECT COUNT(*) INTO v_remaining
    FROM unique_codes
    WHERE deal_id = p_deal_id AND status = 'available';
  ELSE
    v_code := v_deal.deal_code;
  END IF;

  INSERT INTO vouchers (user_id, deal_id, discount_code)
  VALUES (p_user_id, p_deal_id, v_code)
  RETURNING id INTO v_voucher_id;

  INSERT INTO claim_history (
    user_id, voucher_id, deal_id, title, merchant_name, city,
    claimed_at, start_time,
    discount_code, discount_percentage, original_price, pricing_model, price_per_person
  )
  VALUES (
    p_user_id, v_voucher_id, p_deal_id, v_deal.title, v_merchant_name, v_deal.city,
    now(), v_deal.start_time,
    v_code, v_deal.discount_percentage, v_deal.original_price, v_deal.pricing_model, v_deal.price_per_person
  );

  INSERT INTO deal_events (deal_id, event_type, user_id)
  VALUES (p_deal_id, 'click', p_user_id);

  IF v_deal.discount_type = 'unique' AND v_remaining = 0 THEN
    UPDATE deals SET expiry_time = now() WHERE id = p_deal_id;
  END IF;

  RETURN QUERY SELECT v_voucher_id, v_code;
END;
$function$;
