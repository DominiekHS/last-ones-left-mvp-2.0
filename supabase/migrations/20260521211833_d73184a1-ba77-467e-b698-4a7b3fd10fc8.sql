-- Restore EXECUTE for helpers used inside RLS USING/WITH CHECK expressions.
-- Without these grants, every policy that calls has_role/is_merchant_active/is_deal_owner
-- silently fails for the querying user.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_merchant_active(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_deal_owner(uuid, uuid) TO anon, authenticated;