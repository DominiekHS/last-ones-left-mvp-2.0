-- 1. publish_at kolom
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS publish_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deals_publish_at
  ON public.deals (publish_at)
  WHERE publish_at IS NOT NULL;

-- 2. Publieke view verbergt nog niet gepubliceerde advertenties
CREATE OR REPLACE VIEW public.deals_public AS
SELECT id,
    merchant_id,
    title,
    description,
    category,
    city,
    postal_code,
    address,
    image_url,
    original_price,
    discount_percentage,
    discount_type,
    pricing_model,
    price_per_person,
    indicative_price_from,
    start_time,
    start_time_mode,
    expiry_time,
    redemption_method,
    redemption_instructions,
    cancellation_policy,
    terms_summary,
    payment_steps,
    counter_discount_mode,
    checkout_link,
    created_at,
    updated_at,
    is_teaser,
    teaser_body,
    teaser_cta_label,
    teaser_cta_url,
    always_show
   FROM public.deals
  WHERE deleted_at IS NULL
    AND expiry_time > now()
    AND (publish_at IS NULL OR publish_at <= now())
    AND public.is_merchant_active(merchant_id);

-- 3. Eenmalige publicatietaak: mail versturen en zichzelf opruimen
CREATE OR REPLACE FUNCTION public.run_deal_publication(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jobname text := 'publish-deal-' || p_deal_id::text;
BEGIN
  PERFORM net.http_post(
    url     := 'https://otosschuqvmgymmdnawm.supabase.co/functions/v1/publish-scheduled-deals',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'DKK_8X4_Q8kTDeU'
    ),
    body    := jsonb_build_object('dealId', p_deal_id)
  );

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_jobname) THEN
    PERFORM cron.unschedule(v_jobname);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.run_deal_publication(uuid) FROM PUBLIC, anon, authenticated;

-- 4. Trigger die per ingeplande advertentie een eenmalige taak zet/verwijdert
CREATE OR REPLACE FUNCTION public.sync_deal_publication_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jobname text := 'publish-deal-' || NEW.id::text;
  v_at timestamptz;
  v_sched text;
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_jobname) THEN
    PERFORM cron.unschedule(v_jobname);
  END IF;

  v_at := NEW.publish_at;

  IF v_at IS NOT NULL
     AND v_at > now()
     AND NEW.deleted_at IS NULL
     AND NEW.notification_sent_at IS NULL
     AND NEW.is_teaser = false THEN
    v_sched := format(
      '%s %s %s %s *',
      to_char(v_at AT TIME ZONE 'UTC', 'FMMI'),
      to_char(v_at AT TIME ZONE 'UTC', 'FMHH24'),
      to_char(v_at AT TIME ZONE 'UTC', 'FMDD'),
      to_char(v_at AT TIME ZONE 'UTC', 'FMMM')
    );
    PERFORM cron.schedule(
      v_jobname,
      v_sched,
      format('SELECT public.run_deal_publication(%L::uuid);', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_deal_publication_job ON public.deals;
CREATE TRIGGER trg_sync_deal_publication_job
AFTER INSERT OR UPDATE OF publish_at, deleted_at, notification_sent_at ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.sync_deal_publication_job();

-- 5. Vangnet: elk uur controleren of er nog publicaties open staan
SELECT cron.schedule(
  'publish-scheduled-deals-sweep',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://otosschuqvmgymmdnawm.supabase.co/functions/v1/publish-scheduled-deals',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', 'DKK_8X4_Q8kTDeU'
    ),
    body    := '{}'::jsonb
  );
  $$
);