
-- Drop the existing permissive INSERT policy on vouchers
DROP POLICY IF EXISTS "Users can claim vouchers" ON public.vouchers;

-- Recreate INSERT policy: only consumers can claim vouchers
CREATE POLICY "Only consumers can claim vouchers"
ON public.vouchers
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND has_role(auth.uid(), 'consumer'::app_role)
);
