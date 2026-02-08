
-- Migrate existing deals with "stadion" to "sport"
UPDATE public.deals SET category = 'sport' WHERE category = 'stadion';

-- Migrate existing merchants with venue_type "stadion" to "sport"
UPDATE public.merchants SET venue_type = 'sport' WHERE venue_type = 'stadion';

-- Add new enum values
ALTER TYPE public.venue_category ADD VALUE IF NOT EXISTS 'klimbos';
ALTER TYPE public.venue_category ADD VALUE IF NOT EXISTS 'escaperoom';
ALTER TYPE public.venue_category ADD VALUE IF NOT EXISTS 'arcade';
ALTER TYPE public.venue_category ADD VALUE IF NOT EXISTS 'verhuur';
ALTER TYPE public.venue_category ADD VALUE IF NOT EXISTS 'voetbal';
ALTER TYPE public.venue_category ADD VALUE IF NOT EXISTS 'basketbal';

-- Rename enum to remove stadion: create new type, swap columns, drop old
-- PostgreSQL doesn't support removing enum values directly, so we recreate
ALTER TYPE public.venue_category RENAME TO venue_category_old;

CREATE TYPE public.venue_category AS ENUM (
  'bioscoop',
  'theater',
  'sport',
  'museum',
  'bowling',
  'klimbos',
  'escaperoom',
  'arcade',
  'verhuur',
  'paintball',
  'concert',
  'voetbal',
  'basketbal',
  'overig'
);

-- Update deals column
ALTER TABLE public.deals
  ALTER COLUMN category DROP DEFAULT,
  ALTER COLUMN category TYPE public.venue_category USING category::text::public.venue_category,
  ALTER COLUMN category SET DEFAULT 'overig'::public.venue_category;

-- Update merchants column
ALTER TABLE public.merchants
  ALTER COLUMN venue_type DROP DEFAULT,
  ALTER COLUMN venue_type TYPE public.venue_category USING venue_type::text::public.venue_category,
  ALTER COLUMN venue_type SET DEFAULT 'overig'::public.venue_category;

-- Drop old type
DROP TYPE public.venue_category_old;
