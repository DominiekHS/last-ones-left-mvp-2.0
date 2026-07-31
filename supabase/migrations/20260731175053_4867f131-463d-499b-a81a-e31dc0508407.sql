CREATE OR REPLACE FUNCTION public.admin_get_consumer_email_statuses()
RETURNS TABLE(
  user_id uuid,
  confirmation_sent_at timestamp with time zone,
  email_confirmed_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT au.id, au.confirmation_sent_at, au.email_confirmed_at
  FROM auth.users au
  WHERE au.id IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'consumer'::app_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_consumer_email_statuses() TO authenticated;