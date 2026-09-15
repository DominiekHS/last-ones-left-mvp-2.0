DROP VIEW IF EXISTS public.deals_public;
CREATE VIEW public.deals_public AS
SELECT id, merchant_id, title, description, category, city, postal_code, address, image_url,
       original_price, discount_percentage, discount_type, pricing_model, price_per_person,
       indicative_price_from, start_time, start_time_mode, expiry_time, redemption_method,
       redemption_instructions, cancellation_policy, terms_summary, payment_steps,
       counter_discount_mode, checkout_link, cta_label, created_at, updated_at,
       is_teaser, teaser_body, teaser_cta_label, teaser_cta_url, always_show
FROM public.deals
WHERE deleted_at IS NULL AND expiry_time > now() AND (publish_at IS NULL OR publish_at <= now()) AND is_merchant_active(merchant_id);
GRANT SELECT ON public.deals_public TO anon, authenticated;