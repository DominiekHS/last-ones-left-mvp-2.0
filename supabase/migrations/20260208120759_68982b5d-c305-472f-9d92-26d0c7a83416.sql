
-- Add counter_discount_mode to deals
ALTER TABLE public.deals ADD COLUMN counter_discount_mode text NOT NULL DEFAULT 'fixed_price';

-- Existing deals default to fixed_price (already handled by DEFAULT)
