import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ title: "Fout", description: friendlyAuthError(error), variant: "destructive" });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Wachtwoord vergeten</CardTitle>
          <CardDescription>
            {sent
              ? "Controleer je inbox voor verdere instructies."
              : "Vul je e-mailadres in om een resetlink te ontvangen."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Als dit e-mailadres bij ons bekend is, sturen we een e-mail met instructies om je wachtwoord te resetten.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
                Opnieuw proberen
              </Button>
              <Link to="/login" className="block text-sm text-foreground underline">
                Terug naar inloggen
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="naam@voorbeeld.nl"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Bezig..." : "Stuur resetlink"}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground underline">
                  Terug naar inloggen
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
