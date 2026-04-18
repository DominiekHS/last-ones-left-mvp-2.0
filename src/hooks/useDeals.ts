import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActiveDeals(category?: string, city?: string) {
  return useQuery({
    queryKey: ["deals", "active", category, city],
    queryFn: async () => {
      // NB: anon heeft column-level SELECT op `merchants` voor publieke velden
      // (geen contact_email/phone). Zie docs/rls.md.
      let query = supabase
        .from("deals")
        .select("*, merchants(company_name)")
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
      return data;
    },
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, merchants(company_name, city, address, description)")
        .eq("id", id)
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
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("merchant_id", merchantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
  });
}
