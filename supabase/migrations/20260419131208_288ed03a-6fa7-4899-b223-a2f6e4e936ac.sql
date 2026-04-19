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
  -- Auth hardening: caller must be authenticated and may only claim for themselves.
  -- SECURITY DEFINER bypasses RLS, so we replicate the vouchers INSERT policy here.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Cannot claim on behalf of another user';
  END IF;

  -- Check user has consumer role
  IF NOT has_role(p_user_id, 'consumer') THEN
    RAISE EXCEPTION 'Only consumers can claim deals';
  END IF;

  -- Check if already claimed (only non-archived/non-deleted vouchers)
  SELECT v.discount_code INTO v_existing_code
  FROM vouchers v
  WHERE v.user_id = p_user_id AND v.deal_id = p_deal_id AND v.deleted_at IS NULL AND v.status NOT IN ('archived');

  IF FOUND THEN
    RAISE EXCEPTION 'Deal already claimed';
  END IF;

  -- Get deal info
  SELECT d.discount_type, d.discount_code AS deal_code, d.expiry_time, d.title, d.city, d.start_time,
         d.discount_percentage, d.original_price, d.pricing_model, d.price_per_person
  INTO v_deal
  FROM deals d
  WHERE d.id = p_deal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF v_deal.expiry_time < now() THEN
    RAISE EXCEPTION 'Deal has expired';
  END IF;

  -- Get merchant name
  SELECT m.company_name INTO v_merchant_name
  FROM merchants m
  JOIN deals d ON d.merchant_id = m.id
  WHERE d.id = p_deal_id;

  -- Determine code
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

    IF v_remaining = 0 THEN
      UPDATE deals SET expiry_time = now() WHERE id = p_deal_id;
    END IF;
  ELSE
    v_code := v_deal.deal_code;
  END IF;

  -- Create voucher
  INSERT INTO vouchers (user_id, deal_id, discount_code)
  VALUES (p_user_id, p_deal_id, v_code)
  RETURNING id INTO v_voucher_id;

  -- Insert durable history snapshot
  INSERT INTO claim_history (user_id, voucher_id, deal_id, title, merchant_name, city, start_time, claimed_at, discount_code, discount_percentage, original_price, pricing_model, price_per_person)
  VALUES (p_user_id, v_voucher_id, p_deal_id, v_deal.title, v_merchant_name, v_deal.city, now(), v_deal.start_time, v_code, v_deal.discount_percentage, v_deal.original_price, v_deal.pricing_model, v_deal.price_per_person);

  RETURN QUERY SELECT v_voucher_id, v_code;
END;
$function$;