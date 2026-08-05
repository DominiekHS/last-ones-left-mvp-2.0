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

function useSettingToggle(key: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: setting, isLoading } = useQuery({
    queryKey: ["app_setting", key],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("*")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data as SettingRow | null;
    },
  });

  const mutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update({ value: newValue, updated_by: user?.id })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_setting", key] });
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  return { setting, isLoading, mutation, enabled: setting?.value === true };
}

function SettingCard({
  title,
  description,
  label,
  hint,
  setting,
  isLoading,
  enabled,
  onChange,
  pending,
}: {
  title: string;
  description: string;
  label: string;
  hint?: string;
  setting: SettingRow | null | undefined;
  isLoading: boolean;
  enabled: boolean;
  onChange: (v: boolean) => void;
  pending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">
              Status:{" "}
              <span className={enabled ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                {enabled ? "AAN" : "UIT"}
              </span>
            </p>
          </div>
          <Switch checked={enabled} disabled={isLoading || pending} onCheckedChange={onChange} />
        </div>
        {hint && !enabled && <p className="text-xs text-destructive">{hint}</p>}
        {setting?.updated_at && (
          <p className="text-xs text-muted-foreground">
            Laatst gewijzigd op {format(new Date(setting.updated_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
            {setting.updated_by ? " door een admin" : ""}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function PlatformSettingsTab() {
  const merchantSignup = useSettingToggle("merchant_signup_enabled");
  const emailVerification = useSettingToggle("email_verification_required");

  return (
    <div className="space-y-3 mt-4">
      <SettingCard
        title="Ondernemer-registratie"
        description="Zet uit om registreren als ondernemer te blokkeren. Alleen admins kunnen dan ondernemersaccounts aanmaken."
        label="Ondernemers kunnen zich zelf registreren"
        setting={merchantSignup.setting}
        isLoading={merchantSignup.isLoading}
        enabled={merchantSignup.enabled}
        pending={merchantSignup.mutation.isPending}
        onChange={(v) => {
          merchantSignup.mutation.mutate(v, {
            onSuccess: () =>
              toast({
                title: v ? "Registratie ingeschakeld" : "Registratie uitgeschakeld",
                description: v
                  ? "Ondernemers kunnen zich nu zelf registreren."
                  : "Alleen admins kunnen vanaf nu nieuwe ondernemers toevoegen.",
              }),
          });
        }}
      />

      <SettingCard
        title="E-mailverificatie consumenten"
        description="Zet uit tijdens een evenement of markt: consumenten zijn dan direct ingelogd na registreren, zonder bevestigingsmail."
        label="Consumenten moeten hun e-mailadres bevestigen"
        hint="Let op: verificatie staat uit. Nieuwe accounts worden direct actief. Zet dit na het evenement weer aan."
        setting={emailVerification.setting}
        isLoading={emailVerification.isLoading}
        enabled={emailVerification.enabled}
        pending={emailVerification.mutation.isPending}
        onChange={(v) => {
          emailVerification.mutation.mutate(v, {
            onSuccess: () =>
              toast({
                title: v ? "Verificatie ingeschakeld" : "Verificatie uitgeschakeld",
                description: v
                  ? "Nieuwe consumenten moeten hun e-mail bevestigen."
                  : "Nieuwe consumenten zijn direct ingelogd na registreren.",
              }),
          });
        }}
      />
    </div>
  );
}

