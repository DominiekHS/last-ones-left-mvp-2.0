GRANT SELECT (publish_at), INSERT (publish_at), UPDATE (publish_at) ON public.deals TO authenticated;
GRANT SELECT (publish_at) ON public.deals TO anon;