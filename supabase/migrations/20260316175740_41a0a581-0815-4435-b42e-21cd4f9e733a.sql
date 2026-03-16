
-- 1. Create durable claim_history table with snapshot data
CREATE TABLE public.claim_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  voucher_id uuid,
  deal_id uuid,
  title text NOT NULL DEFAULT '',
  merchant_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  start_time timestamptz,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  discount_code text NOT NULL DEFAULT '',
  discount_percentage integer,
  original_price numeric,
  pricing_model text,
  price_per_person numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.claim_history ENABLE ROW LEVEL SECURITY;

-- 3. Consumers can view own history
CREATE POLICY "Users can view own claim history"
ON public.claim_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Admins can view all history
CREATE POLICY "Admins can view all claim history"
ON public.claim_history FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. System can insert (via security definer function)
CREATE POLICY "System can insert claim history"
ON public.claim_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. Backfill from existing vouchers (while deals still exist)
INSERT INTO public.claim_history (user_id, voucher_id, deal_id, title, merchant_name, city, start_time, claimed_at, discount_code, discount_percentage, original_price, pricing_model, price_per_person)
SELECT
  v.user_id,
  v.id,
  d.id,
  d.title,
  m.company_name,
  d.city,
  d.start_time,
  v.claimed_at,
  v.discount_code,
  d.discount_percentage,
  d.original_price,
  d.pricing_model,
  d.price_per_person
FROM public.vouchers v
JOIN public.deals d ON d.id = v.deal_id
JOIN public.merchants m ON m.id = d.merchant_id;

-- 7. Update claim_deal function to also insert into claim_history
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
  VALUES (p_user_id, v_voucher_id, p_deal_id, v_deal.title, v_merchant_name, v_deal.city, v_deal.start_time, now(), v_code, v_deal.discount_percentage, v_deal.original_price, v_deal.pricing_model, v_deal.price_per_person);

  RETURN QUERY SELECT v_voucher_id, v_code;
END;
$function$;
