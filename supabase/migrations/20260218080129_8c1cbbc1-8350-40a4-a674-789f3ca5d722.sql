
-- When a merchant updates a deal's expiry_time to a future date (renewing it),
-- archive all existing vouchers so consumers can re-claim.
CREATE OR REPLACE FUNCTION public.archive_vouchers_on_deal_renewal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when expiry_time changed to a future date
  IF NEW.expiry_time IS DISTINCT FROM OLD.expiry_time
     AND NEW.expiry_time > now()
     AND OLD.expiry_time <= now() THEN
    UPDATE public.vouchers
    SET status = 'archived',
        archived_at = now(),
        discount_code = 'ARCHIVED'
    WHERE deal_id = NEW.id
      AND status IN ('active', 'inactive')
      AND archived_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_archive_vouchers_on_deal_renewal
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.archive_vouchers_on_deal_renewal();
