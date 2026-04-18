-- merchants_public view erft RLS van merchants (security_invoker default).
-- We willen dat anon de basisvelden (company_name, city, etc.) WEL kan zien
-- voor weergave op deal-cards en de publieke bedrijfspagina.
-- Contact-velden (email/phone) staan NIET in deze view → veilig.

-- security_invoker = off zodat de view de RLS van merchants overslaat.
-- De view zelf filtert al op blocked=false AND status='active'.
ALTER VIEW public.merchants_public SET (security_invoker = off);

-- Expliciete grants voor anon + authenticated
GRANT SELECT ON public.merchants_public TO anon, authenticated;