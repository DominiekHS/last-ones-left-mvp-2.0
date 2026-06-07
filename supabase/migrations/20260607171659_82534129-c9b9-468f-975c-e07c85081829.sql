
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_my_referral() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_referral_count() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_referral_leaderboard() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_get_referral_details(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.confirm_my_referral() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_details(uuid, timestamptz, timestamptz) TO authenticated;
