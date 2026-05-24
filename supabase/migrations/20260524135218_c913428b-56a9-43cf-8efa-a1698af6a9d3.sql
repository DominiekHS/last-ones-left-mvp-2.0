CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'consumer');

  -- Alleen consumer hier automatisch toekennen; merchant/admin lopen via edge function / admin actie.
  IF v_role = 'consumer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'consumer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Repareer bestaand account
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'consumer'::app_role FROM auth.users WHERE email = 'spindominiek@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;