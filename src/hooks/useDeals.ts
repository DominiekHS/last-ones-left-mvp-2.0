import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Publieke deals-queries lopen via de view `deals_public`. Die view bevat
 * GEEN `discount_code` — dat veld is alleen leesbaar voor:
 *  - de merchant-eigenaar (via base table `deals`)
 *  - admins (via base table `deals`)
 *  - consumenten die de deal hebben geclaimd (via `vouchers` + RPC `claim_deal`)
 *
 * Idem voor merchants: we joinen op `merchants_public` zodat anon geen
 * contact_email/contact_phone te zien krijgt.
 */
export function useActiveDeals(category?: string, city?: string) {
  return useQuery({
    queryKey: ["deals", "active", category, city],
    queryFn: async () => {
      let query = supabase
        .from("deals_public" as any)
        .select("*, merchants_public!inner(company_name)")
        .gt("expiry_time", new Date().toISOString())
        .order("start_time", { ascending: true });

      if (category && category !== "all") {
        query = query.eq("category", category as any);
      }
      if (city) {
        query = query.ilike("city", city);
      }

      const { data, error } = await query;
      if (error) throw error;
      // Map relation key terug naar `merchants` voor backwards compat met UI
      return (data ?? []).map((d: any) => ({
        ...d,
        merchants: d.merchants_public,
      }));
    },
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      // 1) Probeer eerst de publieke view (filtert verlopen deals)
      const { data, error } = await supabase
        .from("deals_public" as any)
        .select("*, merchants_public!inner(company_name, city, address, description)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          ...(data as any),
          merchants: (data as any).merchants_public,
        };
      }

      // 2) Fallback: misschien is de deal verlopen of soft-deleted maar mag de
      // huidige gebruiker (eigenaar-merchant of admin) hem alsnog zien via RLS
      // op de basis-tabel. Stille fallback — RLS bepaalt of er iets terugkomt.
      const { data: ownerData, error: ownerError } = await supabase
        .from("deals")
        .select("*, merchants(company_name, city, address, description)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (ownerError) return null;
      return ownerData ?? null;
    },
    enabled: !!id,
  });
}

/**
 * Merchant-eigen deal-detail (incl. verlopen advertenties).
 * Gebruikt de base table `deals` zodat RLS "Merchants can view own deals"
 * van toepassing is — die filtert NIET op expiry, in tegenstelling tot
 * de publieke view `deals_public`.
 */
export function useMerchantDeal(id?: string) {
  return useQuery({
    queryKey: ["deal", "merchant-own", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, merchants(company_name, city, address, description)")
        .eq("id", id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useMerchantDeals(merchantId?: string) {
  return useQuery({
    queryKey: ["deals", "merchant", merchantId],
    queryFn: async () => {
      // Merchants kijken naar hun eigen deals — base table is OK,
      // RLS zorgt dat alleen eigen rijen terugkomen, inclusief discount_code.
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("merchant_id", merchantId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
  });
}
