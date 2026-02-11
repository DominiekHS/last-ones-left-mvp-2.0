
-- Add new columns to vouchers
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS code_visible_until timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Add check constraint for status
ALTER TABLE public.vouchers
  ADD CONSTRAINT vouchers_status_check CHECK (status IN ('active', 'inactive', 'archived'));

-- Backfill existing vouchers: set status based on current fields
UPDATE public.vouchers v
SET status = CASE
  WHEN v.deleted_at IS NOT NULL THEN 'archived'
  WHEN v.became_inactive_at IS NOT NULL THEN 'inactive'
  ELSE 'active'
END,
archived_at = v.deleted_at;

-- Set code_visible_until for existing vouchers
UPDATE public.vouchers v
SET code_visible_until = d.expiry_time + interval '24 hours'
FROM public.deals d
WHERE d.id = v.deal_id AND v.code_visible_until IS NULL;

-- Create the consumer_activity_history view (no discount_code!)
CREATE OR REPLACE VIEW public.consumer_activity_history
WITH (security_invoker = on) AS
SELECT
  v.id AS voucher_id,
  v.user_id,
  d.id AS deal_id,
  d.title,
  d.start_time,
  d.city,
  m.company_name AS merchant_name,
  v.claimed_at,
  GREATEST(d.start_time, v.claimed_at) AS completed_at
FROM public.vouchers v
JOIN public.deals d ON d.id = v.deal_id
JOIN public.merchants m ON m.id = d.merchant_id
WHERE d.start_time < now();

-- Grant select on the view to authenticated users
GRANT SELECT ON public.consumer_activity_history TO authenticated;
