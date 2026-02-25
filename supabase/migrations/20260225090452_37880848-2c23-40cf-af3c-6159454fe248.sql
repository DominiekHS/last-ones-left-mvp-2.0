CREATE POLICY "Admins can view all vouchers"
  ON public.vouchers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));