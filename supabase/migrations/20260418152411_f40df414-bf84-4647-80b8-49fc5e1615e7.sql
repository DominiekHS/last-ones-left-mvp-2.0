-- Rollback security_invoker change
ALTER VIEW public.merchants_public SET (security_invoker = on);
REVOKE SELECT ON public.merchants_public FROM anon;

-- Veiliger: column-level GRANT op merchants base table voor anon.
-- Anon krijgt SELECT op alleen de niet-gevoelige kolommen.
-- Contact_email en contact_phone zijn EXPLICIET niet in de lijst.
REVOKE ALL ON public.merchants FROM anon;

GRANT SELECT (
  id,
  company_name,
  description,
  city,
  address,
  postcode,
  venue_type,
  logo_url,
  opening_hours,
  website_url,
  status,
  blocked,
  created_at
) ON public.merchants TO anon;

-- Anon SELECT policy met dezelfde filter als merchants_public view
CREATE POLICY "Anon can view active non-blocked merchants"
ON public.merchants
FOR SELECT
TO anon
USING (blocked = false AND status = 'active');