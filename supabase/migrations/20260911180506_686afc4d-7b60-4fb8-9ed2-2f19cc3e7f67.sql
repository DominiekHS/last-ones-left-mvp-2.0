CREATE TABLE public.test_merchants (
  merchant_id uuid PRIMARY KEY REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, DELETE ON public.test_merchants TO authenticated;
GRANT ALL ON public.test_merchants TO service_role;

ALTER TABLE public.test_merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view test merchants"
ON public.test_merchants FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can mark test merchants"
ON public.test_merchants FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can unmark test merchants"
ON public.test_merchants FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));