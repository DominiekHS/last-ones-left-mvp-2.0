CREATE POLICY "Merchants can delete own deal events"
ON public.deal_events
FOR DELETE
USING (is_deal_owner(auth.uid(), deal_id));