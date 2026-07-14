
GRANT SELECT (is_teaser, always_show, teaser_body, teaser_cta_label, teaser_cta_url)
  ON public.deals TO anon, authenticated;

GRANT INSERT (is_teaser, always_show, teaser_body, teaser_cta_label, teaser_cta_url)
  ON public.deals TO authenticated;

GRANT UPDATE (is_teaser, always_show, teaser_body, teaser_cta_label, teaser_cta_url)
  ON public.deals TO authenticated;
