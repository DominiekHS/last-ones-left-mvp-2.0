import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export function PlatformSettingsTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: setting, isLoading } = useQuery({
    queryKey: ["app_setting", "merchant_signup_enabled"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("*")
        .eq("key", "merchant_signup_enabled")
        .maybeSingle();
      if (error) throw error;
      return data as SettingRow | null;
    },
  });

  const enabled = setting?.value === true;

  const mutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update({ value: newValue, updated_by: user?.id })
        .eq("key", "merchant_signup_enabled");
      if (error) throw error;
    },
    onSuccess: (_d, newValue) => {
      queryClient.invalidateQueries({ queryKey: ["app_setting", "merchant_signup_enabled"] });
      toast({
        title: newValue ? "Registratie ingeschakeld" : "Registratie uitgeschakeld",
        description: newValue
          ? "Ondernemers kunnen zich nu zelf registreren."
          : "Alleen admins kunnen vanaf nu nieuwe ondernemers toevoegen.",
      });
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ondernemer-registratie</CardTitle>
          <CardDescription>
            Zet uit om registreren als ondernemer te blokkeren. Alleen admins kunnen dan ondernemersaccounts aanmaken.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">
                Ondernemers kunnen zich zelf registreren
              </Label>
              <p className="text-xs text-muted-foreground">
                Status: <span className={enabled ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                  {enabled ? "AAN" : "UIT"}
                </span>
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={isLoading || mutation.isPending}
              onCheckedChange={(v) => mutation.mutate(v)}
            />
          </div>
          {setting?.updated_at && (
            <p className="text-xs text-muted-foreground">
              Laatst gewijzigd op {format(new Date(setting.updated_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
              {setting.updated_by ? " door een admin" : ""}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
