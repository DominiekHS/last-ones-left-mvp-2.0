
-- Role enum
CREATE TYPE public.app_role AS ENUM ('consumer', 'merchant', 'admin');

-- Venue category enum
CREATE TYPE public.venue_category AS ENUM ('bioscoop', 'theater', 'sport', 'museum', 'bowling', 'paintball', 'stadion', 'concert', 'overig');

-- Profiles table (consumers & merchants share auth, profile stores extra info)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  date_of_birth DATE,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Merchants table
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  venue_type venue_category NOT NULL DEFAULT 'overig',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  category venue_category NOT NULL DEFAULT 'overig',
  city TEXT NOT NULL DEFAULT '',
  original_price NUMERIC(10,2) NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  start_time TIMESTAMPTZ NOT NULL,
  expiry_time TIMESTAMPTZ NOT NULL,
  checkout_link TEXT NOT NULL DEFAULT '',
  discount_code TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vouchers / claims
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  discount_code TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, deal_id)
);

-- Deal events (views, clicks)
CREATE TABLE public.deal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;

-- has_role helper function (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user is merchant owner of a deal
CREATE OR REPLACE FUNCTION public.is_deal_owner(_user_id UUID, _deal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals d
    JOIN public.merchants m ON d.merchant_id = m.id
    WHERE d.id = _deal_id AND m.user_id = _user_id
  )
$$;

-- =====================
-- RLS POLICIES
-- =====================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER_ROLES (read own, admins read all)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MERCHANTS
CREATE POLICY "Anyone can view non-blocked merchants" ON public.merchants FOR SELECT USING (blocked = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchant can update own profile" ON public.merchants FOR UPDATE USING (auth.uid() = user_id AND blocked = false);
CREATE POLICY "Merchant can insert own profile" ON public.merchants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update any merchant" ON public.merchants FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- DEALS
CREATE POLICY "Anyone can view active deals" ON public.deals FOR SELECT USING (
  expiry_time > now() AND EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.blocked = false)
);
CREATE POLICY "Merchants can view own deals" ON public.deals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid())
);
CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchants can insert own deals" ON public.deals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid() AND m.blocked = false)
);
CREATE POLICY "Merchants can update own deals" ON public.deals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid() AND m.blocked = false)
);
CREATE POLICY "Merchants can delete own deals" ON public.deals FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid())
);
CREATE POLICY "Admins can delete any deal" ON public.deals FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- VOUCHERS
CREATE POLICY "Users can view own vouchers" ON public.vouchers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can claim vouchers" ON public.vouchers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- DEAL_EVENTS
CREATE POLICY "Anyone can insert events" ON public.deal_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Merchants can view own deal events" ON public.deal_events FOR SELECT USING (
  public.is_deal_owner(auth.uid(), deal_id)
);
CREATE POLICY "Admins can view all events" ON public.deal_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for deal images
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-images', 'deal-images', true);

-- Storage policies
CREATE POLICY "Anyone can view deal images" ON storage.objects FOR SELECT USING (bucket_id = 'deal-images');
CREATE POLICY "Merchants can upload deal images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'deal-images' AND public.has_role(auth.uid(), 'merchant')
);
CREATE POLICY "Merchants can update own deal images" ON storage.objects FOR UPDATE USING (
  bucket_id = 'deal-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Merchants can delete own deal images" ON storage.objects FOR DELETE USING (
  bucket_id = 'deal-images' AND auth.uid()::text = (storage.foldername(name))[1]
);
