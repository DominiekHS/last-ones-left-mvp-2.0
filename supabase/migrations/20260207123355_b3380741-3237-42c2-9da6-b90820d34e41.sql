
-- Add fine print fields to deals table
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS redemption_instructions TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS terms_summary TEXT DEFAULT '';
