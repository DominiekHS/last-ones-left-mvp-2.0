import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";
import { Mail } from "lucide-react";

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    if (!email) {
      toast({ title: "Fout", description: "Geen e-mailadres gevonden. Log opnieuw in.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      toast({ title: "Fout", description: friendlyAuthError(error), variant: "destructive" });
    } else {
      toast({ title: "Verstuurd!", description: "Verificatie-e-mail is opnieuw verzonden." });
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    setLoading(false);
  };

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Bevestig je e-mailadres</CardTitle>
          <CardDescription>
            We hebben een verificatie-e-mail gestuurd. Klik op de link in de e-mail om je account te activeren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p>💡 <strong>Tip:</strong> Controleer ook je spam/ongewenste berichten map.</p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={loading || cooldown > 0}
          >
            {cooldown > 0
              ? `Opnieuw versturen (${cooldown}s)`
              : loading
                ? "Bezig..."
                : "E-mail opnieuw versturen"}
          </Button>

          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground underline">
              Terug naar inloggen
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
