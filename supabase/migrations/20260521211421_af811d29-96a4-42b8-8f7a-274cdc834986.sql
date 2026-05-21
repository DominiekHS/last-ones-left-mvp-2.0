-- Revoke EXECUTE on internal helper SECURITY DEFINER functions from public/anon/authenticated.
-- These are only called by RLS policies and triggers (which run as the function owner),
-- so revoking direct EXECUTE does not break anything.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_merchant_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_deal_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_elevated_role_assignment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_vouchers_on_deal_renewal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Public RPCs: keep EXECUTE for authenticated users only (revoke from anon + PUBLIC).
-- Internal authorization is enforced in the function body (auth.uid() checks).
REVOKE EXECUTE ON FUNCTION public.claim_deal(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_deal(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_deal_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_deal_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_merchant_moderation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_merchant_moderation(uuid) TO authenticated;