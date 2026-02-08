import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDealEvents(dealId: string, _period?: string) {
  return useQuery({
    queryKey: ["deal-events-analytics", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_events")
        .select("event_type, created_at")
        .eq("deal_id", dealId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}
