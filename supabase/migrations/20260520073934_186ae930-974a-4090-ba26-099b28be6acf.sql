-- Lock down SECURITY DEFINER functions that should never be called by anon
REVOKE ALL ON FUNCTION public.get_my_deal_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_deal_code(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_deal(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_deal(uuid, uuid) TO authenticated;

-- Trigger-only functions: no one should call them directly via PostgREST
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_vouchers_on_deal_renewal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;