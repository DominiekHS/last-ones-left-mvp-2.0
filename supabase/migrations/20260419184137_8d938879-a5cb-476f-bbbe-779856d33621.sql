CREATE OR REPLACE FUNCTION public.archive_vouchers_on_deal_renewal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Defense in depth: trigger fires from RLS-protected UPDATE on deals,
  -- but we explicitly require an authenticated session to be safe.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
$function$;