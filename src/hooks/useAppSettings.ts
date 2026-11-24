import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSetting {
  key: string;
  value: unknown;
}

export function useAppSetting(key: string) {
  return useQuery({
    queryKey: ["public_app_setting", key],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_app_settings");
      if (error) throw error;
      return data?.find((setting) => setting.key === key) ?? null;
    },
    staleTime: 30_000,
  });
}

export function useMerchantSignupEnabled() {
  const q = useAppSetting("merchant_signup_enabled");
  const enabled = q.data?.value === true;
  return { ...q, enabled };
}
