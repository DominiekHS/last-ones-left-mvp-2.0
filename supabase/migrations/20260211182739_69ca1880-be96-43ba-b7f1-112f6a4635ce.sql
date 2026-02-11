
-- Add start_time_mode column to deals table
ALTER TABLE public.deals ADD COLUMN start_time_mode text NOT NULL DEFAULT 'fixed';

-- Make start_time nullable
ALTER TABLE public.deals ALTER COLUMN start_time DROP NOT NULL;
