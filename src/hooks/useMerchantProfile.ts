import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Publieke merchant-info voor /bedrijf/:id.
 * - Basisvelden komen uit de publieke view `merchants_public` (geen contact-data,
 *   leesbaar voor anonieme bezoekers).
 * - Contactvelden (e-mail, telefoon) worden apart opgehaald uit de base table —
 *   dat lukt alleen voor ingelogde gebruikers (RLS), zodat scrapers ze niet zien.
 */
export function useMerchantPublicProfile(merchantId?: string) {
  return useQuery({
    queryKey: ["merchant-profile", merchantId],
    queryFn: async () => {
      // 1) Basis (publiek)
      const { data: base, error: baseErr } = await supabase
        .from("merchants_public" as any)
        .select("*")
        .eq("id", merchantId!)
        .maybeSingle();
      if (baseErr) throw baseErr;
      if (!base) return null;

      // 2) Contact (alleen voor ingelogde gebruikers — anders levert RLS niets)
      const { data: contact } = await supabase
        .from("merchants")
        .select("contact_email, contact_phone")
        .eq("id", merchantId!)
        .maybeSingle();

      return { ...(base as any), ...(contact ?? {}) };
    },
    enabled: !!merchantId,
  });
}

export function useMerchantActiveDeals(merchantId?: string) {
  return useQuery({
    queryKey: ["deals", "merchant-active", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, merchants(company_name)")
        .eq("merchant_id", merchantId!)
        .gt("expiry_time", new Date().toISOString())
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
  });
}
