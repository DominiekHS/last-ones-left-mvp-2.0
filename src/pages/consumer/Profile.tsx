import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Navigate, Link } from "react-router-dom";

export default function Profile() {
  const { user, profile, roles, merchant, loading, refreshProfile } = useAuth();
  const isMerchant = roles.includes("merchant");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isMerchant && merchant) {
      setFullName(merchant.company_name);
    } else if (profile) {
      setFullName(profile.full_name);
    }
    if (profile) {
      setDob(profile.date_of_birth || "");
    }
  }, [profile, merchant, isMerchant]);

  if (!loading && !user) return <Navigate to="/login" />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (isMerchant && merchant) {
      // Update merchant company_name + sync to profile
      const [merchantRes, profileRes] = await Promise.all([
        supabase.from("merchants").update({ company_name: fullName }).eq("id", merchant.id),
        supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user!.id),
      ]);
      const error = merchantRes.error || profileRes.error;
      if (error) {
        toast({ title: "Fout", description: error.message, variant: "destructive" });
      } else {
        await refreshProfile();
        toast({ title: "Opgeslagen!" });
      }
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, date_of_birth: dob || null })
        .eq("user_id", user!.id);
      if (error) {
        toast({ title: "Fout", description: error.message, variant: "destructive" });
      } else {
        await refreshProfile();
        toast({ title: "Opgeslagen!" });
      }
    }
    setSaving(false);
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
            {!isMerchant && (
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
              <Link to="/merchant/profiel">Bedrijfsprofiel bewerken</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
