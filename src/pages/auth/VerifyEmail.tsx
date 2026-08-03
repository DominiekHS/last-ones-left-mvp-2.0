import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";
import { Mail, AlertTriangle } from "lucide-react";

export default function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const linkFailed = reason === "expired" || reason === "unknown";

  // Vul het e-mailadres vast in als er al een (onbevestigde) sessie is.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, []);

  const handleResend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const target = email.trim();

    if (!target) {
      toast({ title: "Fout", description: "Vul je e-mailadres in.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: target });

    if (error) {
      toast({ title: "Fout", description: friendlyAuthError(error), variant: "destructive" });
    } else {
      toast({ title: "Verstuurd!", description: "We hebben een nieuwe verificatiemail gestuurd." });
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
            {linkFailed ? (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            ) : (
              <Mail className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="font-display text-2xl">
            {linkFailed ? "Deze link werkt niet meer" : "Bevestig je e-mailadres"}
          </CardTitle>
          <CardDescription>
            {linkFailed
              ? "De verificatielink is verlopen of was al gebruikt. Vraag hieronder een nieuwe link aan — die is direct weer geldig."
              : "We hebben een verificatie-e-mail gestuurd. Klik op de link in de e-mail om je account te activeren."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              💡 <strong>Mail niet ontvangen?</strong> Controleer je spam- of ongewenste-berichtenmap. Markeer de mail
              daar als "geen spam" en open hem daarna vanuit je gewone inbox — links in de spammap werken vaak niet.
            </p>
            <p>
              ⏱️ De link is beperkt geldig en kan maar <strong>één keer</strong> gebruikt worden. Vraag je een nieuwe
              mail aan, dan vervalt de link uit de vorige mail. Gebruik dus altijd de <strong>nieuwste</strong> mail.
            </p>
          </div>

          <form onSubmit={handleResend} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="verify-email">E-mailadres</Label>
              <Input
                id="verify-email"
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="jij@voorbeeld.nl"
                required
              />
            </div>
            <Button type="submit" variant="outline" className="w-full" disabled={loading || cooldown > 0}>
              {cooldown > 0
                ? `Opnieuw versturen (${cooldown}s)`
                : loading
                  ? "Bezig..."
                  : "Nieuwe verificatiemail versturen"}
            </Button>
          </form>

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
