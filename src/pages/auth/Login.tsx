import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";
import { useMerchantSignupEnabled } from "@/hooks/useAppSettings";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const { enabled: merchantSignupEnabled } = useMerchantSignupEnabled();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Inloggen mislukt", description: friendlyAuthError(error), variant: "destructive" });
    } else {
      // Use safe internal path only
      const safe = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
      navigate(safe);
    }
    setLoading(false);
  };

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Inloggen</CardTitle>
          <CardDescription>Welkom terug bij Last Ones Left</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Bezig..." : "Inloggen"}
            </Button>
            <div className="text-right">
              <Link to="/wachtwoord-vergeten" className="text-sm text-muted-foreground underline">
                Wachtwoord vergeten?
              </Link>
            </div>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Nog geen account?{" "}
            <Link to="/registreren" className="text-foreground underline">Registreren</Link>
            {merchantSignupEnabled && (
              <>
                <br />
                <Link to="/merchant/registreren" className="text-foreground underline">
                  Registreren als ondernemer
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
