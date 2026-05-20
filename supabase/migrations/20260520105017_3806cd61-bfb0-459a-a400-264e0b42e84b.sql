-- Defense-in-depth: trigger die merchant/admin role-assignment beperkt tot
-- service_role connecties (edge functions) en bestaande admins, ongeacht
-- toekomstige policy-wijzigingen.
CREATE OR REPLACE FUNCTION public.guard_elevated_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
BEGIN
  -- Alleen relevant voor verhoogde rollen.
  IF NEW.role NOT IN ('merchant'::app_role, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- service_role connectie (edge function met SUPABASE_SERVICE_ROLE_KEY)
  -- bypasses RLS én deze check.
  BEGIN
    v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  IF v_jwt_role = 'service_role' OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Bestaande admins mogen rollen toekennen/wijzigen.
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Privilege escalation blocked: only service_role or existing admins may assign role %', NEW.role
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_elevated_role_insert ON public.user_roles;
CREATE TRIGGER guard_elevated_role_insert
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_elevated_role_assignment();

DROP TRIGGER IF EXISTS guard_elevated_role_update ON public.user_roles;
CREATE TRIGGER guard_elevated_role_update
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_elevated_role_assignment();