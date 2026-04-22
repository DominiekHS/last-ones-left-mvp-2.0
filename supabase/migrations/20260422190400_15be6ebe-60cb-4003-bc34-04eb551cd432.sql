-- Vervang de bestaande te-permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert own audit events" ON public.audit_log;

CREATE POLICY "Anyone can insert own audit events"
  ON public.audit_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- user_id moet NULL zijn (anon) of matchen met huidige auth.uid()
    ((user_id IS NULL) OR (user_id = auth.uid()))
    -- length-caps zoals voorheen
    AND (char_length(event_name) <= 100)
    AND (char_length(COALESCE(endpoint, ''::text)) <= 200)
    AND (char_length(COALESCE(request_id, ''::text)) <= 100)
    AND (char_length(COALESCE(ip_hash, ''::text)) <= 128)
    AND (octet_length((metadata)::text) <= 4096)
    -- severity-whitelist
    AND (severity IN ('info', 'warn', 'error', 'critical'))
    -- role-whitelist (NULL toegestaan)
    AND (role IS NULL OR role IN ('anon', 'consumer', 'merchant', 'admin'))
    -- voorkom forgery: als de caller een privileged rol claimt, moet die ook
    -- daadwerkelijk die rol hebben. Voor 'consumer' geldt hetzelfde.
    -- Anon-callers (auth.uid() IS NULL) mogen alleen 'anon' of NULL meegeven.
    AND (
      role IS NULL
      OR (auth.uid() IS NULL AND role = 'anon')
      OR (auth.uid() IS NOT NULL AND (
        role = 'anon'
        OR (role = 'consumer' AND public.has_role(auth.uid(), 'consumer'::public.app_role))
        OR (role = 'merchant' AND public.has_role(auth.uid(), 'merchant'::public.app_role))
        OR (role = 'admin' AND public.has_role(auth.uid(), 'admin'::public.app_role))
      ))
    )
  );