CREATE OR REPLACE FUNCTION public.notification_recipients(p_category text,p_merchant_id uuid)
RETURNS TABLE(user_id uuid,email text,full_name text,notification_mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,p.email,p.full_name,p.notification_mode FROM public.profiles p
 WHERE p.email_notifications_enabled AND p.email<>''
 AND public.has_role(p.user_id,'consumer') AND NOT public.has_role(p.user_id,'admin') AND NOT public.has_role(p.user_id,'merchant')
 AND NOT EXISTS(SELECT 1 FROM public.dummy_accounts d WHERE d.user_id=p.user_id)
 AND (p.notification_mode='all' OR (p.notification_mode='personal' AND EXISTS(
  SELECT 1 FROM public.get_notification_choices() c WHERE c.kind='category' AND c.key=p_category AND c.key=ANY(p.notification_categories)
 )))
$$;
REVOKE ALL ON FUNCTION public.notification_recipients(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notification_recipients(text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_notification_preferences() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_category text;
BEGIN
 IF NEW.notification_mode NOT IN ('all','personal','off') THEN RAISE EXCEPTION 'Ongeldige meldingsvoorkeur'; END IF;
 IF NEW.notification_mode='off' THEN NEW.email_notifications_enabled:=false; END IF;
 IF NEW.notification_mode<>'personal' THEN NEW.notification_categories:='{}'; END IF;
 FOREACH v_category IN ARRAY NEW.notification_categories LOOP
  IF NOT EXISTS(SELECT 1 FROM public.get_notification_choices() c WHERE c.kind='category' AND c.key=v_category) THEN RAISE EXCEPTION 'Deze activiteit is niet beschikbaar'; END IF;
 END LOOP;
 IF NEW.email_notifications_enabled AND NEW.notification_mode='personal' AND NOT EXISTS(
  SELECT 1 FROM public.get_notification_choices() c WHERE c.kind='category' AND c.key=ANY(NEW.notification_categories)
 ) THEN RAISE EXCEPTION 'Kies minimaal één beschikbare activiteit'; END IF;
 NEW.email_notifications_updated_at:=now();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_notification_preferences() FROM PUBLIC,anon,authenticated;

COMMENT ON COLUMN public.profiles.notification_merchants IS 'DEPRECATED: bedrijfskeuze tijdelijk niet in gebruik; consumenten kiezen alleen activiteiten. Waarden blijven bewaard.';