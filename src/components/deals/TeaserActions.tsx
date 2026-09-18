import { useNavigate } from "react-router-dom";
import { Bell, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Twee actieknoppen onder élke voorbeeldadvertentie op de homepage:
 * 1. "Zet meldingen aan" — zet e-mailmeldingen direct aan voor ingelogde
 *    consumenten; stuurt niet-ingelogde bezoekers naar registratie.
 * 2. "Deel met vrienden" — deelt de persoonlijke referral-link (native share
 *    op mobiel, anders kopiëren naar klembord).
 */
export function TeaserActionsRow() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const referralCode = (profile as { referral_code?: string | null } | null)?.referral_code || "";
  const shareUrl = referralCode
    ? `${window.location.origin}/registreren?ref=${referralCode}`
    : `${window.location.origin}/registreren`;

  const handleNotifications = async () => {
    if (!user) {
      navigate("/registreren");
      return;
    }
    const alreadyOn = !!(profile as { email_notifications_enabled?: boolean } | null)
      ?.email_notifications_enabled;
    if (alreadyOn) {
      toast({ title: "Je meldingen staan al aan" });
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        email_notifications_enabled: true,
        email_notifications_updated_at: new Date().toISOString(),
      } as never)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Meldingen aan!", description: "Je ontvangt een mail bij nieuwe last-minute deals." });
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Klembord-API geweigerd of onbeschikbaar: fallback via tijdelijk tekstveld.
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleShare = async () => {
    if (!user) {
      navigate("/registreren");
      return;
    }
    // Eerst het native deelvenster (mobiel); op desktop bestaat het vaak ook,
    // maar als het failt vallen we altijd terug op kopiëren.
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Last Ones Left",
          text: "Ontdek last-minute deals bij jou in de buurt!",
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Een afgebroken native share-venster is geen fout.
        if ((err as DOMException)?.name === "AbortError") return;
        // Alles anders: gewoon verder met kopiëren.
      }
    }
    const copied = await copyToClipboard(shareUrl);
    if (copied) {
      toast({ title: "Link gekopieerd!", description: "Plak hem in een bericht aan je vrienden." });
    } else {
      toast({ title: "Delen mislukt", description: "Probeer het nog eens.", variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <Button onClick={handleNotifications} className="h-10 gap-1.5 text-xs sm:text-sm font-semibold px-2">
        <Bell className="h-4 w-4 shrink-0" />
        Zet meldingen aan
      </Button>
      <Button onClick={handleShare} variant="outline" className="h-10 gap-1.5 text-xs sm:text-sm font-semibold px-2">
        <Share2 className="h-4 w-4 shrink-0" />
        Deel met vrienden
      </Button>
    </div>
  );
}
