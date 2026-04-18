-- Append-only audit log voor structured event tracking
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warn', 'error')),
  user_id UUID,
  role TEXT,
  ip_hash TEXT,
  endpoint TEXT,
  request_id TEXT,
  status_code INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes voor alerts/queries
CREATE INDEX idx_audit_log_event_created ON public.audit_log (event_name, created_at DESC);
CREATE INDEX idx_audit_log_ip_hash_created ON public.audit_log (ip_hash, created_at DESC) WHERE ip_hash IS NOT NULL;
CREATE INDEX idx_audit_log_user_created ON public.audit_log (user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- RLS: append-only
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Iedereen (incl. anon, voor login-failures vóór auth) mag zichzelf loggen.
-- Beperking: user_id moet NULL zijn OF gelijk aan auth.uid(). Geen spoofing.
-- Metadata-grootte gelimiteerd om misbruik te voorkomen.
CREATE POLICY "Anyone can insert own audit events"
ON public.audit_log
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND char_length(event_name) <= 100
  AND char_length(coalesce(endpoint, '')) <= 200
  AND char_length(coalesce(request_id, '')) <= 100
  AND char_length(coalesce(ip_hash, '')) <= 128
  AND octet_length(metadata::text) <= 4096
);

-- Alleen admins kunnen lezen
CREATE POLICY "Admins can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Geen UPDATE of DELETE policies → append-only by absence

COMMENT ON TABLE public.audit_log IS
  'Append-only structured event log. Nooit raw IPs of secrets opslaan; gebruik ip_hash en gefilterde metadata.';