CREATE TABLE public.notification_choices (
 kind text NOT NULL CHECK (kind IN ('category','merchant')),
 key text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 PRIMARY KEY (kind,key)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.notification_choices TO authenticated;
GRANT ALL ON public.notification_choices TO service_role;
ALTER TABLE public.notification_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification choices" ON public.notification_choices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
ALTER TABLE public.profiles ADD COLUMN notification_mode text NOT NULL DEFAULT 'all' CHECK (notification_mode IN ('all','personal'));
ALTER TABLE public.profiles ADD COLUMN notification_categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN notification_merchants uuid[] NOT NULL DEFAULT '{}';
GRANT SELECT,UPDATE(notification_mode,notification_categories,notification_merchants) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.notification_log ADD COLUMN selected_all_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.notification_log ADD COLUMN selected_personal_count integer NOT NULL DEFAULT 0;
CREATE OR REPLACE FUNCTION public.get_notification_choices()
RETURNS TABLE(kind text,key text,label text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT c.kind,c.key,c.key FROM public.notification_choices c WHERE c.kind='category' AND c.enabled AND c.key=ANY(enum_range(NULL::public.venue_category)::text[])
 UNION ALL
 SELECT c.kind,c.key,m.company_name FROM public.notification_choices c JOIN public.merchants m ON m.id::text=c.key WHERE c.kind='merchant' AND c.enabled AND public.is_merchant_active(m.id) AND NOT EXISTS(SELECT 1 FROM public.test_merchants t WHERE t.merchant_id=m.id)
$$;
REVOKE ALL ON FUNCTION public.get_notification_choices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_choices() TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.validate_notification_choice() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.kind='category' AND NOT NEW.key=ANY(enum_range(NULL::public.venue_category)::text[]) THEN RAISE EXCEPTION 'Ongeldige activiteit'; END IF;
 IF NEW.kind='merchant' AND NOT EXISTS(SELECT 1 FROM public.merchants WHERE id::text=NEW.key) THEN RAISE EXCEPTION 'Ongeldig bedrijf'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_notification_choice BEFORE INSERT OR UPDATE ON public.notification_choices FOR EACH ROW EXECUTE FUNCTION public.validate_notification_choice();
CREATE OR REPLACE FUNCTION public.validate_notification_preferences() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_meta jsonb; v_choice text; v_changed boolean; v_cat text; v_merchant uuid;
BEGIN
 IF TG_OP='INSERT' THEN
  SELECT raw_user_meta_data INTO v_meta FROM auth.users WHERE id=NEW.user_id;
  v_choice:=v_meta->>'notification_choice';
  IF v_choice IS NOT NULL THEN
   IF v_choice NOT IN ('all','personal','off') THEN RAISE EXCEPTION 'Kies een geldige meldingsvoorkeur'; END IF;
   NEW.email_notifications_enabled:=v_choice<>'off';
   NEW.notification_mode:=CASE WHEN v_choice='personal' THEN 'personal' ELSE 'all' END;
   SELECT COALESCE(array_agg(DISTINCT x),'{}') INTO NEW.notification_categories FROM jsonb_array_elements_text(COALESCE(v_meta->'notification_categories','[]')) x;
   SELECT COALESCE(array_agg(DISTINCT x::uuid),'{}') INTO NEW.notification_merchants FROM jsonb_array_elements_text(COALESCE(v_meta->'notification_merchants','[]')) x;
  END IF;
  v_changed:=true;
 ELSE
  v_changed:=NEW.notification_mode IS DISTINCT FROM OLD.notification_mode OR NEW.notification_categories IS DISTINCT FROM OLD.notification_categories OR NEW.notification_merchants IS DISTINCT FROM OLD.notification_merchants OR (NEW.email_notifications_enabled AND NOT OLD.email_notifications_enabled);
 END IF;
 IF NOT v_changed THEN RETURN NEW; END IF;
 IF NEW.notification_mode NOT IN ('all','personal') THEN RAISE EXCEPTION 'Ongeldige meldingsvoorkeur'; END IF;
 FOREACH v_cat IN ARRAY NEW.notification_categories LOOP
  IF NOT v_cat=ANY(enum_range(NULL::public.venue_category)::text[]) THEN RAISE EXCEPTION 'Ongeldige activiteit'; END IF;
  IF TG_OP='INSERT' OR NOT v_cat=ANY(OLD.notification_categories) THEN
   IF NOT EXISTS(SELECT 1 FROM public.get_notification_choices() c WHERE c.kind='category' AND c.key=v_cat) THEN RAISE EXCEPTION 'Deze activiteit is niet beschikbaar'; END IF;
  END IF;
 END LOOP;
 FOREACH v_merchant IN ARRAY NEW.notification_merchants LOOP
  IF TG_OP='INSERT' OR NOT v_merchant=ANY(OLD.notification_merchants) THEN
   IF NOT EXISTS(SELECT 1 FROM public.get_notification_choices() c WHERE c.kind='merchant' AND c.key=v_merchant::text) THEN RAISE EXCEPTION 'Dit bedrijf is niet beschikbaar'; END IF;
  END IF;
 END LOOP;
 IF NEW.email_notifications_enabled AND NEW.notification_mode='personal' AND NOT EXISTS(
  SELECT 1 FROM public.get_notification_choices() c WHERE (c.kind='category' AND c.key=ANY(NEW.notification_categories)) OR (c.kind='merchant' AND c.key=ANY(NEW.notification_merchants::text[]))
 ) THEN RAISE EXCEPTION 'Kies minimaal één beschikbare activiteit of één bedrijf'; END IF;
 NEW.email_notifications_updated_at:=now();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_notification_preferences() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_notification_preferences BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_notification_preferences();
CREATE OR REPLACE FUNCTION public.notification_recipients(p_category text,p_merchant_id uuid)
RETURNS TABLE(user_id uuid,email text,full_name text,notification_mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.user_id,p.email,p.full_name,p.notification_mode FROM public.profiles p
 WHERE p.email_notifications_enabled AND p.email<>''
 AND public.has_role(p.user_id,'consumer') AND NOT public.has_role(p.user_id,'admin') AND NOT public.has_role(p.user_id,'merchant')
 AND NOT EXISTS(SELECT 1 FROM public.dummy_accounts d WHERE d.user_id=p.user_id)
 AND (p.notification_mode='all' OR (p.notification_mode='personal' AND EXISTS(
 SELECT 1 FROM public.get_notification_choices() c WHERE
 (c.kind='category' AND c.key=p_category AND c.key=ANY(p.notification_categories)) OR
 (c.kind='merchant' AND c.key=p_merchant_id::text AND p_merchant_id=ANY(p.notification_merchants))
 )))
$$;
REVOKE ALL ON FUNCTION public.notification_recipients(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notification_recipients(text,uuid) TO service_role;