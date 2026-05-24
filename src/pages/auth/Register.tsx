import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Registratie mislukt", description: "Wachtwoord is te zwak. Gebruik minimaal 8 tekens.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, phone, role: "consumer" },
      },
    });

    if (error) {
      toast({ title: "Registratie mislukt", description: friendlyAuthError(error), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Rol wordt automatisch toegekend via de handle_new_user DB-trigger.
    // Profiel-DOB hier nog updaten (niet in metadata opgenomen).
    if (data.user && dob) {
      await supabase.from("profiles").update({ date_of_birth: dob }).eq("user_id", data.user.id);
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
          <CardTitle className="font-display text-2xl">Account aanmaken</CardTitle>
          <CardDescription>Binnen 1 minuut deals claimen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-muted-foreground">* Verplicht veld</p>
            <div className="space-y-2">
              <Label htmlFor="name">Volledige naam *</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Geboortedatum</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
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
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
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
