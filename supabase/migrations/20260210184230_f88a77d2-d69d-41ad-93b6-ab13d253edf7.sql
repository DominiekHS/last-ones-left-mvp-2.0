
ALTER TABLE public.deals ADD COLUMN price_per_person numeric NULL;

-- Migrate existing data
UPDATE public.deals 
SET price_per_person = indicative_price_from 
WHERE pricing_model = 'per_person_variable' 
  AND indicative_price_from IS NOT NULL 
  AND price_per_person IS NULL;
