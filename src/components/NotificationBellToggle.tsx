import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function NotificationBellToggle() {
  const { user, profile, refreshProfile } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEnabled(
        !!(profile as { email_notifications_enabled?: boolean }).email_notifications_enabled,
      );
    }
  }, [profile]);

  if (!user) return null;

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        email_notifications_enabled: checked,
        email_notifications_updated_at: new Date().toISOString(),
      } as never)
      .eq("user_id", user.id);
    if (error) {
      setEnabled(!checked);
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: checked ? "Meldingen aan" : "Meldingen uit" });
    }
    setSaving(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificatie-instellingen"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {enabled && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="bell-email-notif" className="cursor-pointer">
              E-mail meldingen ontvangen
            </Label>
            <p className="text-xs text-muted-foreground">
              Ontvang een mail wanneer er een nieuwe last-minute deal is.
            </p>
          </div>
          <Switch
            id="bell-email-notif"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
