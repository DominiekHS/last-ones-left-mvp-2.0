-- 1) Lock down internal moderation columns on merchants.
-- These columns hold admin-only operational data and must NOT be readable by
-- regular consumers/merchants via the PostgREST API.
REVOKE SELECT (status_reason, status_notes, status_updated_at, status_updated_by)
  ON public.merchants FROM PUBLIC, anon, authenticated;

-- 2) Admin-only RPC to fetch these moderation fields for a specific merchant.
CREATE OR REPLACE FUNCTION public.admin_get_merchant_moderation(p_merchant_id uuid)
RETURNS TABLE (
  status_reason text,
  status_notes text,
  status_updated_at timestamptz,
  status_updated_by text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    SELECT m.status_reason, m.status_notes, m.status_updated_at, m.status_updated_by
    FROM public.merchants m
    WHERE m.id = p_merchant_id;
END;
$$;

-- Only authenticated users (admins are authenticated) should be able to call this.
REVOKE EXECUTE ON FUNCTION public.admin_get_merchant_moderation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_merchant_moderation(uuid) TO authenticated;