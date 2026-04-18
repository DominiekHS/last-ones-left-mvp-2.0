import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSetting {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export function useAppSetting(key: string) {
  return useQuery({
    queryKey: ["app_setting", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings" as any)
        .select("*")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data as AppSetting | null) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useMerchantSignupEnabled() {
  const q = useAppSetting("merchant_signup_enabled");
  const enabled = q.data?.value === true;
  return { ...q, enabled };
}
