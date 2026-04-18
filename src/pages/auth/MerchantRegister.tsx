import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { useMerchantSignupEnabled } from "@/hooks/useAppSettings";
import { Lock } from "lucide-react";

type VenueCategory = Database["public"]["Enums"]["venue_category"];

export default function MerchantRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [venueType, setVenueType] = useState<VenueCategory>("overig");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [postcodeError, setPostcodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { enabled: merchantSignupEnabled, isLoading: settingLoading } = useMerchantSignupEnabled();

  const normalizePostcode = (value: string): string => {
    const cleaned = value.replace(/\s/g, "").toUpperCase();
    if (/^\d{4}[A-Z]{2}$/.test(cleaned)) {
      return cleaned.slice(0, 4) + " " + cleaned.slice(4);
    }
    return value;
  };

  const validatePostcode = (value: string): boolean => {
    const cleaned = value.replace(/\s/g, "").toUpperCase();
    return /^\d{4}[A-Z]{2}$/.test(cleaned);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePostcode(postcode)) {
      setPostcodeError("Voer een geldige postcode in (bijv. 1234 AB)");
      return;
    }
    setPostcodeError("");
    setLoading(true);
    const normalizedPostcode = normalizePostcode(postcode);

    const { data, error } = await supabase.functions.invoke("merchant-signup", {
      body: {
        email,
        password,
        company_name: companyName,
        venue_type: venueType,
        address,
        postcode: normalizedPostcode,
        city,
        contact_phone: phone || null,
      },
    });

    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Onbekende fout";
      const friendly = msg === "Merchant signup disabled"
        ? "Registratie voor ondernemers is tijdelijk gesloten."
        : msg;
      toast({ title: "Registratie mislukt", description: friendly, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({
      title: "Account aangemaakt!",
      description: "Controleer je e-mail om je account te verifiëren.",
    });
    navigate("/verify-email");
    setLoading(false);
  };

  if (settingLoading) {
    return (
      <div className="container py-12 text-center text-sm text-muted-foreground">Laden...</div>
    );
  }

  if (!merchantSignupEnabled) {
    return (
      <div className="container flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Registratie tijdelijk gesloten</CardTitle>
            <CardDescription>
              Registreren als ondernemer is op dit moment niet mogelijk. Wil je toch partner worden? Neem contact met ons op.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link to="/contact">Neem contact op</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Terug naar home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Registreren als ondernemer</CardTitle>
          <CardDescription>Plaats deals en bereik nieuwe klanten</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-muted-foreground">* Verplicht veld</p>
            <div className="space-y-2">
              <Label htmlFor="company">Bedrijfsnaam *</Label>
              <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Type locatie *</Label>
              <Select value={venueType} onValueChange={(v) => setVenueType(v as VenueCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Straatnaam + huisnummer *</Label>
              <Input id="address" placeholder="Bijv. Spinhuisplein 14" value={address} onChange={(e) => setAddress(e.target.value)} required minLength={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input id="postcode" placeholder="Bijv. 8011 ZZ" value={postcode} onChange={(e) => { setPostcode(e.target.value); setPostcodeError(""); }} required />
                {postcodeError && <p className="text-sm text-destructive">{postcodeError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Plaats *</Label>
                <Input id="city" placeholder="Bijv. Zwolle" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Bezig..." : "Registreren"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Al een account?{" "}
            <Link to="/login" className="text-foreground underline">Inloggen</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
