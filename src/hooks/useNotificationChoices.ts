import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { CATEGORY_LABELS } from "@/lib/constants";

export function useNotificationChoices() {
  return useQuery({
    queryKey: ["notification-choices"],
    queryFn: async () => {
      const rows = await fetchAllRows((from, to) => supabase.rpc("get_notification_choices").order("kind").order("key").range(from, to));
      return rows.map(c => ({ ...c, label: c.kind === "category" ? CATEGORY_LABELS[c.key] || c.key : c.label }))
        .sort((a, b) => a.label.localeCompare(b.label, "nl"));
    },
    staleTime: 0,
  });
}