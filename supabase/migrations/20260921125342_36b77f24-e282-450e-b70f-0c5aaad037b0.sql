CREATE OR REPLACE FUNCTION public.archive_vouchers_on_deal_renewal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Alleen bij verlenging van een verlopen deal worden kortingscodes gearchiveerd.
  -- Geen auth-check meer: RLS bepaalt wie mag updaten, en achtergrondtaken
  -- (service_role) moeten deals kunnen bijwerken zonder ingelogde gebruiker.
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