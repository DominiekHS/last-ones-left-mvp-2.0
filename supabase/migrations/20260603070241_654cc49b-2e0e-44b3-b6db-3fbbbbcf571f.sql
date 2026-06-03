CREATE OR REPLACE FUNCTION public.guard_elevated_role_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt_role text;
  v_claims_json text;
BEGIN
  IF NEW.role NOT IN ('merchant'::app_role, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Legacy GUC (oude PostgREST)
  BEGIN
    v_jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;

  -- Nieuwe JWT claims JSON (huidige PostgREST / signing keys)
  IF v_jwt_role IS NULL OR v_jwt_role = '' THEN
    BEGIN
      v_claims_json := current_setting('request.jwt.claims', true);
      IF v_claims_json IS NOT NULL AND v_claims_json <> '' THEN
        v_jwt_role := (v_claims_json::jsonb ->> 'role');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_jwt_role = 'service_role' OR current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Privilege escalation blocked: only service_role or existing admins may assign role %', NEW.role
    USING ERRCODE = '42501';
END;
$function$;