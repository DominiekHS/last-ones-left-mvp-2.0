import { useState, useEffect, useRef } from "react";
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
import { Camera } from "lucide-react";

export default function MerchantProfile() {
  const { user, merchant, roles, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (merchant) {
      setCompanyName(merchant.company_name);
      setCity(merchant.city);
      setAddress(merchant.address);
      setPostcode((merchant as any).postcode || "");
      setDescription(merchant.description || "");
      setContactEmail((merchant as any).contact_email || "");
      setContactPhone((merchant as any).contact_phone || "");
      setWebsiteUrl((merchant as any).website_url || "");
      setLogoUrl((merchant as any).logo_url || "");
    }
  }, [merchant]);

  if (!loading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Bestand te groot", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;
    const { error } = await supabase.storage.from("merchant-logos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload mislukt", description: error.message, variant: "destructive" });
    } else {
      const { data: { publicUrl } } = supabase.storage.from("merchant-logos").getPublicUrl(path);
      setLogoUrl(publicUrl);
      toast({ title: "Logo geüpload!" });
    }
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    if (websiteUrl && !/^https?:\/\/.+\..+/.test(websiteUrl) && !/^[a-z0-9].*\..+/i.test(websiteUrl)) {
      toast({ title: "Ongeldige website URL", variant: "destructive" });
      return;
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast({ title: "Ongeldig e-mailadres", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("merchants")
      .update({
        company_name: companyName,
        city,
        address,
        postcode,
        description: description.trim(),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        website_url: websiteUrl,
        logo_url: logoUrl || null,
      } as any)
      .eq("id", merchant.id);

    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-profile"] });
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
    <div className="container py-6 max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Bedrijfsprofiel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold">
                    {companyName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Camera className="mr-1 h-4 w-4" />{uploading ? "Uploaden..." : "Upload logo"}
                </Button>
              </div>
            </div>

            {/* Basis */}
            <div className="space-y-2">
              <Label>E-mailadres (account)</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Bedrijfsnaam *</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
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

            {/* Adres */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Adres</h3>
              <div className="space-y-2">
                <Input id="address" placeholder="Straat + huisnummer" value={address} onChange={(e) => setAddress(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                  <Input placeholder="Stad *" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Contactgegevens</h3>
              <div className="space-y-2">
                <Input type="email" placeholder="Contact e-mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                <Input type="tel" placeholder="Telefoon (optioneel)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                <Input type="url" placeholder="Website URL (optioneel)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              </div>
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
