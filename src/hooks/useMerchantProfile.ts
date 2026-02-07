import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMerchantPublicProfile(merchantId?: string) {
  return useQuery({
    queryKey: ["merchant-profile", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", merchantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
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
