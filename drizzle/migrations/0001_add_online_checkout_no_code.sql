ALTER TABLE public.deals DROP CONSTRAINT deals_redemption_method_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_redemption_method_check CHECK (redemption_method IN ('online_checkout','at_counter','online_pay_pos_refund','online_checkout_no_code'));
ALTER TABLE public.deals DROP CONSTRAINT deals_discount_type_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_discount_type_check CHECK (discount_type IN ('universal','unique','none'));
ALTER TABLE public.vouchers ADD COLUMN redemption_method text;
GRANT SELECT (redemption_method), INSERT (redemption_method) ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
CREATE OR REPLACE FUNCTION public.validate_no_code_checkout() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.redemption_method = 'online_checkout_no_code' THEN
  IF btrim(NEW.checkout_link) = '' OR NEW.checkout_link !~* '^https?://' THEN
   RAISE EXCEPTION 'Checkout link is verplicht';
  END IF;
  IF NEW.payment_steps IS NULL OR jsonb_typeof(NEW.payment_steps) IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Stappenplan is verplicht';
  END IF;
  IF jsonb_array_length(NEW.payment_steps) < 1 OR EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.payment_steps) step WHERE length(btrim(COALESCE(step->>'text',''))) < 5) THEN
   RAISE EXCEPTION 'Vul minimaal één volledige stap in';
  END IF;
  NEW.discount_type := 'none';
  NEW.discount_code := '';
 ELSIF NEW.discount_type = 'none' THEN
  RAISE EXCEPTION 'Type none is alleen geldig voor afrekenen zonder kortingscode';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_no_code_checkout BEFORE INSERT OR UPDATE OF redemption_method, discount_type, discount_code, checkout_link, payment_steps ON public.deals FOR EACH ROW EXECUTE FUNCTION public.validate_no_code_checkout();
CREATE OR REPLACE FUNCTION public.claim_deal(p_user_id uuid, p_deal_id uuid)
RETURNS TABLE(voucher_id uuid, discount_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
 v_deal RECORD;
 v_code text;
 v_voucher_id uuid;
 v_existing_code text;
 v_remaining int;
 v_merchant_name text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Cannot claim on behalf of another user'; END IF;
 IF NOT has_role(p_user_id, 'consumer') THEN RAISE EXCEPTION 'Only consumers can claim deals'; END IF;
 SELECT v.discount_code INTO v_existing_code FROM vouchers v WHERE v.user_id = p_user_id AND v.deal_id = p_deal_id AND v.deleted_at IS NULL AND v.status NOT IN ('archived');
 IF FOUND THEN RAISE EXCEPTION 'Deal already claimed'; END IF;
 SELECT d.discount_type, d.discount_code AS deal_code, d.expiry_time, d.title, d.city, d.start_time, d.discount_percentage, d.original_price, d.pricing_model, d.price_per_person, d.is_teaser, d.redemption_method INTO v_deal FROM deals d WHERE d.id = p_deal_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Deal not found'; END IF;
 IF v_deal.is_teaser THEN RAISE EXCEPTION 'Cannot claim teaser advertisement'; END IF;
 IF v_deal.expiry_time < now() THEN RAISE EXCEPTION 'Deal has expired'; END IF;
 SELECT m.company_name INTO v_merchant_name FROM merchants m JOIN deals d ON d.merchant_id = m.id WHERE d.id = p_deal_id;
 IF v_deal.redemption_method = 'online_checkout_no_code' THEN
  v_code := '';
 ELSIF v_deal.discount_type = 'unique' THEN
  UPDATE unique_codes uc SET status = 'assigned', assigned_to_user_id = p_user_id, assigned_at = now()
  WHERE uc.id = (SELECT uc2.id FROM unique_codes uc2 WHERE uc2.deal_id = p_deal_id AND uc2.status = 'available' LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING uc.code INTO v_code;
  IF v_code IS NULL THEN RAISE EXCEPTION 'No codes available for this deal'; END IF;
  SELECT COUNT(*) INTO v_remaining FROM unique_codes WHERE deal_id = p_deal_id AND status = 'available';
 ELSE v_code := v_deal.deal_code;
 END IF;
 INSERT INTO vouchers (user_id, deal_id, discount_code, redemption_method) VALUES (p_user_id, p_deal_id, v_code, v_deal.redemption_method) RETURNING id INTO v_voucher_id;
 INSERT INTO claim_history (user_id, voucher_id, deal_id, title, merchant_name, city, claimed_at, start_time, discount_code, discount_percentage, original_price, pricing_model, price_per_person)
 VALUES (p_user_id, v_voucher_id, p_deal_id, v_deal.title, v_merchant_name, v_deal.city, now(), v_deal.start_time, v_code, v_deal.discount_percentage, v_deal.original_price, v_deal.pricing_model, v_deal.price_per_person);
 INSERT INTO deal_events (deal_id, event_type, user_id) VALUES (p_deal_id, 'click', p_user_id);
 IF v_deal.discount_type = 'unique' AND v_remaining = 0 THEN UPDATE deals SET expiry_time = now() WHERE id = p_deal_id; END IF;
 RETURN QUERY SELECT v_voucher_id, v_code;
END;
$$;