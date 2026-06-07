
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_exists boolean;
  i int;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_code;
END;
$$;

UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  referred_email text NOT NULL DEFAULT '',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_verified_at ON public.referrals(verified_at);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrers can view own referrals" ON public.referrals;
CREATE POLICY "Referrers can view own referrals"
ON public.referrals FOR SELECT TO authenticated
USING (referrer_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals"
ON public.referrals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_referral_code text;
  v_referrer_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    public.generate_referral_code()
  );

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'consumer');

  IF v_role = 'consumer' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'consumer'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL AND length(v_referral_code) > 0 THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = upper(v_referral_code)
    LIMIT 1;

    IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
      INSERT INTO public.referrals (referrer_user_id, referred_user_id, referred_email)
      VALUES (v_referrer_id, NEW.id, NEW.email)
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_my_referral()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email_confirmed_at INTO v_confirmed FROM auth.users WHERE id = auth.uid();
  IF v_confirmed IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.referrals
  SET verified_at = now()
  WHERE referred_user_id = auth.uid()
    AND verified_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_count()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::int
  FROM public.referrals
  WHERE referrer_user_id = auth.uid()
    AND verified_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_referral_leaderboard()
RETURNS TABLE(
  referrer_user_id uuid,
  full_name text,
  email text,
  total_verified bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
  SELECT r.referrer_user_id,
         COALESCE(p.full_name, ''),
         COALESCE(p.email, ''),
         COUNT(*) AS total_verified
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.user_id = r.referrer_user_id
  WHERE r.verified_at IS NOT NULL
  GROUP BY r.referrer_user_id, p.full_name, p.email
  ORDER BY total_verified DESC, COALESCE(p.full_name,'') ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_referral_details(
  p_referrer_user_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL
)
RETURNS TABLE(
  referred_user_id uuid,
  referred_email text,
  verified_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  RETURN QUERY
  SELECT r.referred_user_id, r.referred_email, r.verified_at, r.created_at
  FROM public.referrals r
  WHERE r.referrer_user_id = p_referrer_user_id
    AND r.verified_at IS NOT NULL
    AND (p_from IS NULL OR r.verified_at >= p_from)
    AND (p_to IS NULL OR r.verified_at < p_to)
  ORDER BY r.verified_at DESC;
END;
$$;
