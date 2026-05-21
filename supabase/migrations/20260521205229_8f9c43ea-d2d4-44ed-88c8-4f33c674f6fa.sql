-- Fix: views moeten als definer draaien zodat anon/consumenten de
-- publieke deal- en merchant-data kunnen zien. De views filteren zelf de
-- gevoelige kolommen en beperken tot actieve, niet-verlopen records.
ALTER VIEW public.deals_public SET (security_invoker=off);
ALTER VIEW public.merchants_public SET (security_invoker=off);

-- Zorg dat anon/authenticated rechten hebben op de views
GRANT SELECT ON public.deals_public TO anon, authenticated;
GRANT SELECT ON public.merchants_public TO anon, authenticated;