
-- Drop all existing policies and recreate as PERMISSIVE

-- user_roles
DROP POLICY "Users can view own roles" ON public.user_roles;
DROP POLICY "Admins can view all roles" ON public.user_roles;
DROP POLICY "System inserts roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY "Users can view own profile" ON public.profiles;
DROP POLICY "Users can update own profile" ON public.profiles;
DROP POLICY "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- merchants
DROP POLICY "Anyone can view non-blocked merchants" ON public.merchants;
DROP POLICY "Merchant can update own profile" ON public.merchants;
DROP POLICY "Merchant can insert own profile" ON public.merchants;
DROP POLICY "Admin can update any merchant" ON public.merchants;

CREATE POLICY "Anyone can view non-blocked merchants" ON public.merchants FOR SELECT USING (blocked = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchant can update own profile" ON public.merchants FOR UPDATE TO authenticated USING (auth.uid() = user_id AND blocked = false);
CREATE POLICY "Merchant can insert own profile" ON public.merchants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can update any merchant" ON public.merchants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- deals
DROP POLICY "Anyone can view active deals" ON public.deals;
DROP POLICY "Merchants can view own deals" ON public.deals;
DROP POLICY "Admins can view all deals" ON public.deals;
DROP POLICY "Merchants can insert own deals" ON public.deals;
DROP POLICY "Merchants can update own deals" ON public.deals;
DROP POLICY "Merchants can delete own deals" ON public.deals;
DROP POLICY "Admins can delete any deal" ON public.deals;

CREATE POLICY "Anyone can view active deals" ON public.deals FOR SELECT USING (
  expiry_time > now() AND EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.blocked = false)
);
CREATE POLICY "Merchants can view own deals" ON public.deals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid())
);
CREATE POLICY "Admins can view all deals" ON public.deals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchants can insert own deals" ON public.deals FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid() AND m.blocked = false)
);
CREATE POLICY "Merchants can update own deals" ON public.deals FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid() AND m.blocked = false)
);
CREATE POLICY "Merchants can delete own deals" ON public.deals FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid())
);
CREATE POLICY "Admins can delete any deal" ON public.deals FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- vouchers
DROP POLICY "Users can view own vouchers" ON public.vouchers;
DROP POLICY "Users can claim vouchers" ON public.vouchers;

CREATE POLICY "Users can view own vouchers" ON public.vouchers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can claim vouchers" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- deal_events
DROP POLICY "Anyone can insert events for existing deals" ON public.deal_events;
DROP POLICY "Merchants can view own deal events" ON public.deal_events;
DROP POLICY "Admins can view all events" ON public.deal_events;

CREATE POLICY "Anyone can insert events for existing deals" ON public.deal_events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.deals WHERE id = deal_id AND expiry_time > now())
);
CREATE POLICY "Merchants can view own deal events" ON public.deal_events FOR SELECT TO authenticated USING (
  public.is_deal_owner(auth.uid(), deal_id)
);
CREATE POLICY "Admins can view all events" ON public.deal_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
