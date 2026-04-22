import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/storage-uploads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { friendlyDbError } from "@/lib/friendly-errors";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil, X, Save, Mail, Building2, MapPin, Phone, Globe, FileText, Tag } from "lucide-react";
import { CATEGORIES, CATEGORY_LABELS, type VenueCategory } from "@/lib/constants";

export default function MerchantProfile() {
  const { user, merchant, roles, loading, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
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

  const syncFromMerchant = () => {
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
  };

  useEffect(() => {
    syncFromMerchant();
  }, [merchant]);

  if (!loading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  const handleCancel = () => {
    syncFromMerchant();
    setIsEditing(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const { url } = await uploadImage({
        bucket: "merchant-logos",
        userId: user.id,
        file,
        fixedName: "logo",
        upsert: true,
      });
      setLogoUrl(url);
      toast({ title: "Logo geüpload!" });
    } catch (err) {
      toast({
        title: "Upload mislukt",
        description: err instanceof Error ? err.message : "Probeer opnieuw",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const normalizePostcode = (value: string): string => {
    const cleaned = value.replace(/\s/g, "").toUpperCase();
    if (/^\d{4}[A-Z]{2}$/.test(cleaned)) {
      return cleaned.slice(0, 4) + " " + cleaned.slice(4);
    }
    return value;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;

    if (postcode && !/^\d{4}\s?[A-Za-z]{2}$/.test(postcode)) {
      toast({ title: "Ongeldige postcode", description: "Gebruik NL formaat (bijv. 1234 AB)", variant: "destructive" });
      return;
    }
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
        postcode: normalizePostcode(postcode),
        description: description.trim(),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        website_url: websiteUrl,
        logo_url: logoUrl || null,
      } as any)
      .eq("id", merchant.id);

    if (error) {
      toast({ title: "Fout", description: friendlyDbError(error), variant: "destructive" });
    } else {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-profile"] });
      toast({ title: "Profiel opgeslagen!" });
      setIsEditing(false);
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

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value || <span className="text-muted-foreground italic">Niet ingevuld</span>}</p>
      </div>
    </div>
  );

  return (
    <div className="container py-6 max-w-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Mijn profiel</h1>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="mr-1 h-4 w-4" /> Bewerk profiel
          </Button>
        )}
      </div>

      {isEditing ? (
        /* ===== EDIT MODE ===== */
        <form onSubmit={handleSave} className="space-y-4">
          {/* Account */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>E-mailadres (account)</Label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div className="space-y-1">
                <Label htmlFor="companyName">Bedrijfsnaam *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Categorie</Label>
                <Input value={CATEGORY_LABELS[merchant.venue_type] || merchant.venue_type} disabled />
                <p className="text-xs text-muted-foreground">
                  Categorie kan niet zelf gewijzigd worden. Neem contact op met support voor een aanpassing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bedrijfsprofiel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bedrijfsprofiel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
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
              <div className="space-y-1">
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
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contactgegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Contact e-mail</Label>
                <Input type="email" placeholder="Contact e-mail" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Telefoon</Label>
                <Input type="tel" placeholder="Telefoon (optioneel)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Website</Label>
                <Input type="url" placeholder="Website URL (optioneel)" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Adres */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adresgegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="address">Straatnaam + huisnummer *</Label>
                <Input id="address" placeholder="Bijv. Spinhuisplein 14" value={address} onChange={(e) => setAddress(e.target.value)} required minLength={3} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input id="postcode" placeholder="Bijv. 8011 ZZ" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="city">Plaats *</Label>
                  <Input id="city" placeholder="Bijv. Zwolle" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acties */}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">
              <Save className="mr-1 h-4 w-4" /> {saving ? "Opslaan..." : "Opslaan"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="mr-1 h-4 w-4" /> Annuleren
            </Button>
          </div>
        </form>
      ) : (
        /* ===== VIEW MODE ===== */
        <div className="space-y-4">
          {/* Account */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow icon={Mail} label="E-mailadres" value={user?.email} />
              <InfoRow icon={Building2} label="Bedrijfsnaam" value={companyName} />
              <InfoRow icon={Tag} label="Categorie" value={CATEGORY_LABELS[merchant.venue_type] || merchant.venue_type} />
            </CardContent>
          </Card>

          {/* Bedrijfsprofiel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bedrijfsprofiel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 py-2">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold">
                    {companyName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Logo</p>
                  <p className="text-sm">{logoUrl ? "Geüpload" : <span className="text-muted-foreground italic">Geen logo</span>}</p>
                </div>
              </div>
              <InfoRow icon={FileText} label="Omschrijving" value={description} />
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contactgegevens</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow icon={Mail} label="Contact e-mail" value={contactEmail} />
              <InfoRow icon={Phone} label="Telefoon" value={contactPhone} />
              <InfoRow icon={Globe} label="Website" value={websiteUrl} />
            </CardContent>
          </Card>

          {/* Adres */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adresgegevens</CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow icon={MapPin} label="Straat + huisnummer" value={address} />
              <InfoRow icon={MapPin} label="Postcode" value={postcode} />
              <InfoRow icon={MapPin} label="Plaats" value={city} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
