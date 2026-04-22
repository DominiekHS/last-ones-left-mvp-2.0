-- =============================================================
-- Stap 1: Views terug op security_invoker (best practice)
-- =============================================================
ALTER VIEW public.merchants_public SET (security_invoker = on);
ALTER VIEW public.deals_public     SET (security_invoker = on);

-- =============================================================
-- Stap 2: Anon SELECT-policies herstellen op base tables,
--         maar gevoelige kolommen worden op kolomniveau geweerd.
-- =============================================================

-- Anon mag actieve, niet-geblokkeerde merchants zien.
-- (column-level GRANT/REVOKE hieronder filtert de gevoelige velden.)
CREATE POLICY "Anon can view active non-blocked merchants"
ON public.merchants
FOR SELECT
TO anon
USING (blocked = false AND status = 'active' AND deleted_at IS NULL);

-- Anon mag actieve deals zien (kortingscode wordt op kolomniveau geweerd).
CREATE POLICY "Anon can view active deals"
ON public.deals
FOR SELECT
TO anon
USING (deleted_at IS NULL AND expiry_time > now() AND public.is_merchant_active(merchant_id));

-- =============================================================
-- Stap 3: Column-level kolombescherming voor anon
-- =============================================================
-- Trek alle SELECT-rechten in en herstel ze per kolom — behalve de gevoelige.

-- merchants: geen contact_email, geen contact_phone
REVOKE SELECT ON public.merchants FROM anon;
GRANT SELECT (
  id, user_id, company_name, venue_type, address, city, postcode,
  description, logo_url, website_url, opening_hours,
  blocked, status, suspended_until,
  created_at, updated_at, deleted_at
) ON public.merchants TO anon;

-- deals: geen discount_code
REVOKE SELECT ON public.deals FROM anon;
GRANT SELECT (
  id, merchant_id, title, description, category, city, postal_code, address,
  image_url, original_price, discount_percentage, discount_type,
  pricing_model, price_per_person, indicative_price_from,
  start_time, start_time_mode, expiry_time,
  redemption_method, redemption_instructions, cancellation_policy,
  terms_summary, payment_steps, counter_discount_mode, checkout_link,
  notification_sent_at, deleted_at, created_at, updated_at
) ON public.deals TO anon;

-- Authenticated users hebben volledige toegang via bestaande policies;
-- column-grants voor authenticated blijven default (alle kolommen).
