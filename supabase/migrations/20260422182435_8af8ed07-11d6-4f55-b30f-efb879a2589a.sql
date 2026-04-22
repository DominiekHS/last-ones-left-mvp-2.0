-- Maak update_updated_at_column SECURITY INVOKER (i.p.v. DEFINER):
-- de functie zet alleen NEW.updated_at = now() en heeft geen verhoogde
-- privileges nodig. SECURITY INVOKER is altijd veiliger als het kan.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;