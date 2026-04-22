-- Restore SELECT grants on merchants_public view for anonymous and authenticated users.
-- The view uses security_invoker=on, so the underlying merchants RLS policies still
-- apply (anon can only see active, non-blocked, non-deleted merchants).
GRANT SELECT ON public.merchants_public TO anon, authenticated;