-- 1. Restrictive policy: elke INSERT op user_roles MOET role='consumer' zijn EN user_id=auth.uid().
-- Restrictive policies AND-en met permissive policies, dus dit blokkeert elke poging tot
-- merchant/admin self-assignment, ongeacht welke andere permissive policies er zijn.
CREATE POLICY "Restrict role inserts to consumer self-assignment"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'consumer'::public.app_role
  );

-- 2. DELETE-policy: alleen admins. Voorheen was er geen DELETE policy waardoor RLS standaard
-- alle DELETEs blokkeert; we maken het expliciet zodat per-ongeluk-permissive toekomstige
-- policies niet de boel openzetten, en zodat admins wel kunnen opruimen.
CREATE POLICY "Only admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. UPDATE-policy: alleen admins. Zelfde reden.
CREATE POLICY "Only admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));