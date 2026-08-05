CREATE TABLE public.dummy_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT, INSERT, DELETE ON public.dummy_accounts TO authenticated;
GRANT ALL ON public.dummy_accounts TO service_role;

ALTER TABLE public.dummy_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dummy accounts"
ON public.dummy_accounts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can mark dummy accounts"
ON public.dummy_accounts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can unmark dummy accounts"
ON public.dummy_accounts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));