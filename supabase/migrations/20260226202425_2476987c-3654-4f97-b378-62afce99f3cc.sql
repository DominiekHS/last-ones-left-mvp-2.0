
CREATE POLICY "Consumers can view their claimed deals"
ON public.deals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vouchers v
    WHERE v.deal_id = deals.id
    AND v.user_id = auth.uid()
  )
);
