
-- ============================================================
-- 1) MERCHANTS: hide contact_email/contact_phone from public
-- ============================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view non-blocked merchants" ON public.merchants;

-- Public can only see non-sensitive fields via a view
CREATE OR REPLACE VIEW public.merchants_public
WITH (security_invoker = on) AS
SELECT
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
FROM public.merchants
WHERE blocked = false AND status = 'active';

GRANT SELECT ON public.merchants_public TO anon, authenticated;

-- Restore SELECT on base table only for owner + admin
CREATE POLICY "Owner can view own merchant row"
ON public.merchants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all merchant rows"
ON public.merchants
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users may also view non-blocked merchants WITHOUT contact details
-- (needed for deal-detail pages, merchant public profile, etc. where address/name is shown)
-- We still expose the base table to authenticated users for non-blocked merchants,
-- because the app uses base-table queries in many places. Sensitive fields (contact_email,
-- contact_phone) will be hidden in the application layer by selecting only safe columns.
-- For unauthenticated visitors, only the view is accessible.
CREATE POLICY "Authenticated can view non-blocked merchants"
ON public.merchants
FOR SELECT
TO authenticated
USING (blocked = false AND status = 'active');

-- ============================================================
-- 2) USER_ROLES: prevent privilege escalation
-- ============================================================

DROP POLICY IF EXISTS "System inserts roles" ON public.user_roles;

-- Authenticated users may ONLY assign themselves the 'consumer' role
-- (used during self-signup). Merchant + admin roles are assigned server-side
-- via edge functions using the service-role key.
CREATE POLICY "Users can self-assign consumer role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'consumer'::app_role
);

-- ============================================================
-- 3) UNIQUE_CODES: tighten role from public to authenticated
-- ============================================================

DROP POLICY IF EXISTS "Merchants can insert codes for own deals" ON public.unique_codes;
DROP POLICY IF EXISTS "Merchants can view own deal codes" ON public.unique_codes;
DROP POLICY IF EXISTS "Merchants can update own deal codes" ON public.unique_codes;
DROP POLICY IF EXISTS "Merchants can delete own deal codes" ON public.unique_codes;
DROP POLICY IF EXISTS "Users can view their assigned codes" ON public.unique_codes;
DROP POLICY IF EXISTS "Admins can view all codes" ON public.unique_codes;

CREATE POLICY "Merchants can insert codes for own deals"
ON public.unique_codes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Merchants can view own deal codes"
ON public.unique_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Merchants can update own deal codes"
ON public.unique_codes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Merchants can delete own deal codes"
ON public.unique_codes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their assigned codes"
ON public.unique_codes
FOR SELECT
TO authenticated
USING (assigned_to_user_id = auth.uid());

CREATE POLICY "Admins can view all codes"
ON public.unique_codes
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 4) DEAL_SALES_DAILY: tighten role from public to authenticated
-- ============================================================

DROP POLICY IF EXISTS "Merchants can view own deal sales" ON public.deal_sales_daily;
DROP POLICY IF EXISTS "Merchants can insert own deal sales" ON public.deal_sales_daily;
DROP POLICY IF EXISTS "Merchants can update own deal sales" ON public.deal_sales_daily;
DROP POLICY IF EXISTS "Merchants can delete own deal sales" ON public.deal_sales_daily;
DROP POLICY IF EXISTS "Admins can view all deal sales" ON public.deal_sales_daily;

CREATE POLICY "Merchants can view own deal sales"
ON public.deal_sales_daily
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Merchants can insert own deal sales"
ON public.deal_sales_daily
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Merchants can update own deal sales"
ON public.deal_sales_daily
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Merchants can delete own deal sales"
ON public.deal_sales_daily
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    JOIN merchants m ON d.merchant_id = m.id
    WHERE d.id = deal_sales_daily.deal_id AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all deal sales"
ON public.deal_sales_daily
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
