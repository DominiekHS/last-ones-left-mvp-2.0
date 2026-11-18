CREATE TABLE public.consumer_email_confirmation_methods (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('manual', 'not_required', 'self')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.consumer_email_confirmation_methods TO authenticated;
GRANT ALL ON public.consumer_email_confirmation_methods TO service_role;

ALTER TABLE public.consumer_email_confirmation_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read consumer email confirmation methods"
ON public.consumer_email_confirmation_methods
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION public.admin_get_consumer_email_statuses();

CREATE FUNCTION public.admin_get_consumer_email_statuses()
RETURNS TABLE(
  user_id uuid,
  confirmation_sent_at timestamptz,
  email_confirmed_at timestamptz,
  confirmation_method text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT au.id, au.confirmation_sent_at, au.email_confirmed_at, cm.method
  FROM auth.users au
  LEFT JOIN public.consumer_email_confirmation_methods cm ON cm.user_id = au.id
  WHERE au.id IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'consumer'::app_role
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_consumer_email_statuses() TO authenticated;