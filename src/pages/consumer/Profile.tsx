import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { friendlyDbError } from "@/lib/friendly-errors";
import { Navigate, Link } from "react-router-dom";

export default function Profile() {
  const { user, profile, roles, merchant, loading, refreshProfile } = useAuth();
  const isMerchant = roles.includes("merchant");
  const isAdmin = roles.includes("admin");
  const isConsumer = roles.includes("consumer") || (!isMerchant && !isAdmin);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isMerchant && merchant) {
      setFullName(merchant.company_name);
    } else if (profile) {
      setFullName(profile.full_name);
    }
    if (profile) {
      setDob(profile.date_of_birth || "");
      setEmailNotifications(
        !!(profile as { email_notifications_enabled?: boolean }).email_notifications_enabled,
      );
    }
  }, [profile, merchant, isMerchant]);

  if (!loading && !user) return <Navigate to="/login" />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (isMerchant && merchant) {
      const [merchantRes, profileRes] = await Promise.all([
        supabase.from("merchants").update({ company_name: fullName }).eq("id", merchant.id),
        supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user!.id),
      ]);
      const error = merchantRes.error || profileRes.error;
      if (error) {
        toast({ title: "Fout", description: friendlyDbError(error), variant: "destructive" });
      } else {
        await refreshProfile();
        toast({ title: "Opgeslagen!" });
      }
    } else {
      const updateData: Record<string, unknown> = { full_name: fullName };
      if (!isAdmin) {
        updateData.date_of_birth = dob || null;
      }
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user!.id);
      if (error) {
        toast({ title: "Fout", description: friendlyDbError(error), variant: "destructive" });
      } else {
        await refreshProfile();
        toast({ title: "Opgeslagen!" });
      }
    }
    setSaving(false);
  };

  const handleToggleNotifications = async (checked: boolean) => {
    setEmailNotifications(checked);
    setSavingNotifications(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        email_notifications_enabled: checked,
        email_notifications_updated_at: new Date().toISOString(),
      } as never)
      .eq("user_id", user!.id);
    if (error) {
      setEmailNotifications(!checked);
      toast({ title: "Fout", description: friendlyDbError(error), variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Instelling opgeslagen" });
    }
    setSavingNotifications(false);
  };

  return (
    <div className="container py-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Mijn Profiel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>E-mailadres</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{isMerchant ? "Bedrijfsnaam" : "Naam"}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            {!isMerchant && !isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="dob">Geboortedatum</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
            )}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isConsumer && !isAdmin && !isMerchant && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="font-display text-lg">Notificaties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="email-notif" className="cursor-pointer">
                  E-mail meldingen ontvangen
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ontvang een mail wanneer er een nieuwe last-minute deal is.
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={emailNotifications}
                onCheckedChange={handleToggleNotifications}
                disabled={savingNotifications}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardContent className="p-4">
          <Button variant="outline" size="sm" asChild className="w-full">
            <Link to="/help">Help & support</Link>
          </Button>
        </CardContent>
      </Card>

      {isMerchant && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/merchant/profiel">Mijn bedrijfsprofiel</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
