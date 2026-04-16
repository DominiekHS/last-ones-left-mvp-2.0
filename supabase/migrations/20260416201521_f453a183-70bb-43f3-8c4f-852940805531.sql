-- Consumer email notification preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_notifications_updated_at timestamptz;

-- Deal: track if new-deal notification has been sent (idempotency)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz;

-- Notification log
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  error_details text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notification log"
  ON public.notification_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
