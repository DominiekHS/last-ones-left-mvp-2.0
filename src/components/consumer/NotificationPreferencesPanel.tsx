import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationPreferenceFields } from "./NotificationPreferenceFields";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useNotificationChoices } from "@/hooks/useNotificationChoices";
import { hasAvailablePreference, type NotificationChoice } from "@/lib/notification-preferences";

export function NotificationPreferencesPanel() {
  const { user, profile, refreshProfile } = useAuth();
  const { data: choices, refetch } = useNotificationChoices();
  const [choice, setChoice] = useState<NotificationChoice>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!profile) return;
    setChoice(profile.notification_mode === "personal" ? "personal" : "all");
    setCategories(profile.notification_categories);
    setEnabled(profile.email_notifications_enabled);
  }, [profile]);

  const save = async () => {
    if (!user) return;
    if (enabled && choice === "personal" && !hasAvailablePreference({ notification_categories: categories }, choices || [])) {
      toast({ title: "Kies minimaal één beschikbare activiteit", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      notification_mode: choice,
      notification_categories: categories,
      email_notifications_enabled: enabled,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Voorkeuren niet opgeslagen", description: error.message, variant: "destructive" });
      await refetch();
    } else {
      await refreshProfile();
      toast({ title: "Meldingsvoorkeuren opgeslagen" });
    }
    setSaving(false);
  };
  return <section className="space-y-5 py-4">
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor="preferences-enabled">E-mailmeldingen ontvangen</Label>
      <Switch id="preferences-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={saving} />
    </div>
    <NotificationPreferenceFields choice={choice} categories={categories} onChoice={setChoice} onCategories={setCategories} disabled={saving} />
    <Button onClick={save} disabled={saving} className="w-full bg-success text-success-foreground hover:bg-success/90">{saving ? "Opslaan…" : "Voorkeuren opslaan"}</Button>
  </section>;
}