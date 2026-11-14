CREATE OR REPLACE FUNCTION public.populate_signup_birth_date() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_dob text;
BEGIN
 SELECT raw_user_meta_data->>'date_of_birth' INTO v_dob FROM auth.users WHERE id=NEW.user_id;
 IF NEW.date_of_birth IS NULL AND NULLIF(v_dob,'') IS NOT NULL THEN NEW.date_of_birth:=v_dob::date; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.populate_signup_birth_date() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER populate_signup_birth_date BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.populate_signup_birth_date();