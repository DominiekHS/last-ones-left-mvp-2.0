
-- Grant necessary permissions to anon and authenticated roles
GRANT SELECT ON public.deals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.deals TO authenticated;

GRANT SELECT ON public.merchants TO anon, authenticated;
GRANT INSERT, UPDATE ON public.merchants TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT, INSERT ON public.user_roles TO authenticated;

GRANT SELECT, INSERT ON public.vouchers TO authenticated;

GRANT SELECT, INSERT ON public.deal_events TO anon, authenticated;
