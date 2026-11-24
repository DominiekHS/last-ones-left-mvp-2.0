DROP POLICY "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Admins can read app settings"
ON public.app_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE ALL ON public.app_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

CREATE FUNCTION public.get_public_app_settings()
RETURNS TABLE(key text, value jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.key, s.value
  FROM public.app_settings s
  WHERE s.key IN ('merchant_signup_enabled', 'email_verification_required')
    AND jsonb_typeof(s.value) = 'boolean';
$$;
REVOKE ALL ON FUNCTION public.get_public_app_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_app_settings() TO anon, authenticated, service_role;

ALTER TABLE public.help_categories ADD COLUMN is_published boolean NOT NULL DEFAULT false;
UPDATE public.help_categories SET is_published = true;
COMMENT ON COLUMN public.help_categories.is_published IS 'Only explicitly published categories are visible to public readers; existing public categories remain published.';
DROP POLICY "Anyone can view help categories" ON public.help_categories;
CREATE POLICY "Anyone can view published help categories"
ON public.help_categories FOR SELECT TO anon, authenticated
USING (is_published = true);
GRANT SELECT ON public.help_categories TO anon, authenticated;
GRANT ALL ON public.help_categories TO service_role;