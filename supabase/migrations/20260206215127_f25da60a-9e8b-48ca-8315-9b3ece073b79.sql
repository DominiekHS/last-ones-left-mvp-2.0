
-- Fix the permissive INSERT policy on deal_events to require a valid deal reference
DROP POLICY "Anyone can insert events" ON public.deal_events;
CREATE POLICY "Anyone can insert events for existing deals" ON public.deal_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND expiry_time > now())
);
