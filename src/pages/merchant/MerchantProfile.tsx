import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

export default function MerchantProfile() {
  const { user, merchant, roles, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (merchant) {
      setCompanyName(merchant.company_name);
      setCity(merchant.city);
      setAddress(merchant.address);
      setDescription((merchant as any).description || "");
    }
  }, [merchant]);

  if (!loading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    setSaving(true);

    const { error } = await supabase
      .from("merchants")
      .update({ company_name: companyName, city, address, description: description.trim() })
      .eq("id", merchant.id);

    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      // Invalidate all deal queries so merchant name updates everywhere
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal"] });
      toast({ title: "Profiel opgeslagen!" });
    }
    setSaving(false);
  };

  if (!merchant) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Profiel laden...</p>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Bedrijfsprofiel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>E-mailadres</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Bedrijfsnaam *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Stad</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Omschrijving</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Korte 'Over ons' tekst (max 600 tekens)"
                maxLength={600}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{description.length}/600 tekens</p>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Opslaan..." : "Opslaan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
