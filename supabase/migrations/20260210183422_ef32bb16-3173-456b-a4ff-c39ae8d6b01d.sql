
-- Add pricing_model column (fixed = default, per_person_variable = new)
ALTER TABLE public.deals ADD COLUMN pricing_model text NOT NULL DEFAULT 'fixed';

-- Add constraint for valid values
ALTER TABLE public.deals ADD CONSTRAINT deals_pricing_model_check 
  CHECK (pricing_model IN ('fixed', 'per_person_variable'));

-- Add indicative_price_from for variable pricing (optional "vanaf" price)
ALTER TABLE public.deals ADD COLUMN indicative_price_from numeric NULL;
