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

type VenueCategory = Database["public"]["Enums"]["venue_category"];

export default function MerchantRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [venueType, setVenueType] = useState<VenueCategory>("overig");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: companyName },
      },
    });

    if (error) {
      toast({ title: "Registratie mislukt", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Assign merchant role
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: "merchant" });

      // Create merchant record
      await supabase.from("merchants").insert({
        user_id: data.user.id,
        company_name: companyName,
        venue_type: venueType,
        address,
        city,
      });
    }

    toast({
      title: "Account aangemaakt!",
      description: "Controleer je e-mail om je account te verifiëren.",
    });
    navigate("/verify-email");
    setLoading(false);
  };

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
              <Label htmlFor="address">Adres *</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Stad *</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
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
