-- Allow anonymous view tracking, exclude merchants and admins
GRANT INSERT ON public.deal_events TO anon;

DROP POLICY IF EXISTS "Authenticated can insert events for active deals" ON public.deal_events;

CREATE POLICY "Anon can insert events for active deals"
ON public.deal_events
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_events.deal_id
      AND deals.expiry_time > now()
  )
);

CREATE POLICY "Consumers can insert events for active deals"
ON public.deal_events
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND public.has_role(auth.uid(), 'consumer'::app_role)
  AND NOT public.has_role(auth.uid(), 'merchant'::app_role)
  AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.deals
    WHERE deals.id = deal_events.deal_id
      AND deals.expiry_time > now()
  )
);