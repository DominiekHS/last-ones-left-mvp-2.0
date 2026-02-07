
-- Add status fields to merchants table
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_notes text,
  ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS status_updated_by text;

-- Migrate existing blocked column data to status
UPDATE public.merchants SET status = 'blocked' WHERE blocked = true;

-- Create merchant_communications table
CREATE TABLE public.merchant_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  subject text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  outcome_status text NOT NULL DEFAULT 'open',
  contact_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage merchant communications"
  ON public.merchant_communications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create admin_actions audit log table
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text NOT NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin actions"
  ON public.admin_actions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update deals RLS: hide deals from suspended/blocked merchants for consumers
DROP POLICY IF EXISTS "Anyone can view active deals" ON public.deals;
CREATE POLICY "Anyone can view active deals"
  ON public.deals FOR SELECT
  USING (
    (expiry_time > now())
    AND (EXISTS (
      SELECT 1 FROM merchants m
      WHERE m.id = deals.merchant_id
        AND m.blocked = false
        AND m.status = 'active'
    ))
  );

-- Update trigger for updated_at on merchant_communications
CREATE TRIGGER update_merchant_communications_updated_at
  BEFORE UPDATE ON public.merchant_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
