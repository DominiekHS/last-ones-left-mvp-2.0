
-- Add new columns to deals table
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS redemption_method text NOT NULL DEFAULT 'online_checkout',
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'universal';

-- Add check constraint for redemption_method
ALTER TABLE public.deals
  ADD CONSTRAINT deals_redemption_method_check CHECK (redemption_method IN ('online_checkout', 'at_counter'));

-- Add check constraint for discount_type
ALTER TABLE public.deals
  ADD CONSTRAINT deals_discount_type_check CHECK (discount_type IN ('universal', 'unique'));

-- Create unique_codes table
CREATE TABLE public.unique_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  assigned_to_user_id uuid NULL,
  assigned_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_codes_status_check CHECK (status IN ('available', 'assigned'))
);

-- Enable RLS
ALTER TABLE public.unique_codes ENABLE ROW LEVEL SECURITY;

-- Merchants can insert codes for their own deals
CREATE POLICY "Merchants can insert codes for own deals"
  ON public.unique_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.merchants m ON d.merchant_id = m.id
      WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
    )
  );

-- Merchants can view codes for their own deals
CREATE POLICY "Merchants can view own deal codes"
  ON public.unique_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.merchants m ON d.merchant_id = m.id
      WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
    )
  );

-- Merchants can update codes for their own deals
CREATE POLICY "Merchants can update own deal codes"
  ON public.unique_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.merchants m ON d.merchant_id = m.id
      WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
    )
  );

-- Merchants can delete codes for their own deals
CREATE POLICY "Merchants can delete own deal codes"
  ON public.unique_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      JOIN public.merchants m ON d.merchant_id = m.id
      WHERE d.id = unique_codes.deal_id AND m.user_id = auth.uid()
    )
  );

-- System can assign codes to users (for claiming)
CREATE POLICY "Users can view their assigned codes"
  ON public.unique_codes FOR SELECT
  USING (assigned_to_user_id = auth.uid());

-- Admins can view all codes
CREATE POLICY "Admins can view all codes"
  ON public.unique_codes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_unique_codes_deal_id ON public.unique_codes(deal_id);
CREATE INDEX idx_unique_codes_status ON public.unique_codes(deal_id, status);
