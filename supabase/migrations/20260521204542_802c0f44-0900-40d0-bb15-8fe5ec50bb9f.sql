-- Drop overly broad SELECT policies on public.merchants
DROP POLICY IF EXISTS "Anon can view active non-blocked merchants" ON public.merchants;
DROP POLICY IF EXISTS "Authenticated can view non-blocked merchants" ON public.merchants;

-- Owner + admin SELECT policies already exist:
--   "Owner can view own merchant row"
--   "Admin can view all merchant rows"
-- Public reads (homepage, deal detail, merchant public profile) go through
-- the SECURITY INVOKER view `public.merchants_public`, which exposes only
-- non-sensitive columns and is readable by anon + authenticated.