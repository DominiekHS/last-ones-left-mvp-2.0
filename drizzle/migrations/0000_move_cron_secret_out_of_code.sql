CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.internal_keys (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON private.internal_keys FROM PUBLIC, anon, authenticated;

INSERT INTO private.internal_keys (name, value)
VALUES ('cron', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, created_at = now();

CREATE OR REPLACE FUNCTION public.get_cron_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT value FROM private.internal_keys WHERE name = 'cron' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_secret() TO service_role;

CREATE OR REPLACE FUNCTION public.call_cron_function(p_function text, p_body jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_id bigint;
BEGIN
  IF p_function NOT IN ('cleanup-vouchers', 'publish-scheduled-deals') THEN
    RAISE EXCEPTION 'Unknown function';
  END IF;
  SELECT net.http_post(
    url     := 'https://otosschuqvmgymmdnawm.supabase.co/functions/v1/' || p_function,
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', public.get_cron_secret()),
    body    := p_body
  ) INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.call_cron_function(text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.run_deal_publication(p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_jobname text := 'publish-deal-' || p_deal_id::text;
BEGIN
  PERFORM public.call_cron_function('publish-scheduled-deals', jsonb_build_object('dealId', p_deal_id));
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_jobname) THEN
    PERFORM cron.unschedule(v_jobname);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.run_deal_publication(uuid) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('cleanup-inactive-vouchers', '0 * * * *', $c$SELECT public.call_cron_function('cleanup-vouchers');$c$);
SELECT cron.schedule('publish-scheduled-deals-sweep', '0 * * * *', $c$SELECT public.call_cron_function('publish-scheduled-deals');$c$);