ALTER TABLE public.deals DROP CONSTRAINT deals_redemption_method_check;

ALTER TABLE public.deals ADD CONSTRAINT deals_redemption_method_check 
  CHECK (redemption_method IN ('online_checkout', 'at_counter', 'online_pay_pos_refund'));