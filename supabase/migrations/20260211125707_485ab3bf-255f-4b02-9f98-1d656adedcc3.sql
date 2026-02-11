
-- Create a function to atomically claim a deal
-- Handles both universal codes (from deals.discount_code) and unique codes (from unique_codes table)
CREATE OR REPLACE FUNCTION public.claim_deal(p_user_id uuid, p_deal_id uuid)
RETURNS TABLE(voucher_id uuid, discount_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deal RECORD;
  v_code text;
  v_voucher_id uuid;
  v_existing_code text;
BEGIN
  -- Check user has consumer role
  IF NOT has_role(p_user_id, 'consumer') THEN
    RAISE EXCEPTION 'Only consumers can claim deals';
  END IF;

  -- Check if already claimed
  SELECT v.discount_code INTO v_existing_code
  FROM vouchers v
  WHERE v.user_id = p_user_id AND v.deal_id = p_deal_id AND v.deleted_at IS NULL;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Deal already claimed';
  END IF;

  -- Get deal info
  SELECT d.discount_type, d.discount_code AS deal_code, d.expiry_time
  INTO v_deal
  FROM deals d
  WHERE d.id = p_deal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF v_deal.expiry_time < now() THEN
    RAISE EXCEPTION 'Deal has expired';
  END IF;

  -- Determine code
  IF v_deal.discount_type = 'unique' THEN
    -- Atomically assign a unique code
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
  ELSE
    v_code := v_deal.deal_code;
  END IF;

  -- Create voucher
  INSERT INTO vouchers (user_id, deal_id, discount_code)
  VALUES (p_user_id, p_deal_id, v_code)
  RETURNING id INTO v_voucher_id;

  RETURN QUERY SELECT v_voucher_id, v_code;
END;
$$;
