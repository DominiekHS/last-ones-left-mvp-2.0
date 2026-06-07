import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function ReferralShareCard() {
  const { profile, user } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  const referralCode = (profile as { referral_code?: string | null } | null)?.referral_code || "";
  const shareUrl = referralCode
    ? `${window.location.origin}/registreren?ref=${referralCode}`
    : "";

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_referral_count").then(({ data }) => {
      setCount(typeof data === "number" ? data : 0);
    });
  }, [user]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link gekopieerd!", description: "Plak hem in een bericht aan je vrienden." });
    } catch {
      toast({ title: "Kopiëren mislukt", description: "Selecteer de link handmatig.", variant: "destructive" });
    }
  };

  if (!referralCode) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Deel Last Ones Left
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Deel deze link met vrienden. Zodra zij een account aanmaken en hun e-mail bevestigen,
          tellen we ze mee bij jouw aantal.
        </p>
        <div className="space-y-2">
          <Label htmlFor="referral-link">Jouw persoonlijke link</Label>
          <div className="flex gap-2">
            <Input id="referral-link" value={shareUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" onClick={copyLink} className="shrink-0 gap-1">
              <Copy className="h-4 w-4" />
              Kopieer
            </Button>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">Aangemelde vrienden: </span>
          <span className="font-semibold">{count === null ? "…" : count}</span>
        </div>
      </CardContent>
    </Card>
  );
}
