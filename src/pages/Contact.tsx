import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TURNSTILE_SITE_KEY = "0x4AAAAAADTAKOEcDNNsv2LL";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string>("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const scriptId = "cf-turnstile-script";
    const renderWidget = () => {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t: string) => setToken(t),
        "error-callback": () => setToken(""),
        "expired-callback": () => setToken(""),
      });
    };

    if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = renderWidget;
      document.head.appendChild(s);
    } else {
      renderWidget();
    }

    return () => {
      if (window.turnstile && widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: if filled, silently "succeed" without doing anything.
    if (website.trim() !== "") {
      toast({ title: "Bericht verzonden!", description: "We nemen zo snel mogelijk contact met je op." });
      setName(""); setEmail(""); setMessage("");
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || trimmedName.length > 100) {
      toast({ title: "Naam ongeldig", description: "Vul een naam in (max 100 tekens).", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      toast({ title: "E-mailadres ongeldig", description: "Controleer je e-mailadres.", variant: "destructive" });
      return;
    }
    if (!trimmedMessage || trimmedMessage.length > 2000) {
      toast({ title: "Bericht ongeldig", description: "Vul een bericht in (max 2000 tekens).", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({ title: "Verificatie vereist", description: "Wacht tot de beveiligingscheck is voltooid.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-message", {
        body: { name: trimmedName, email: trimmedEmail, message: trimmedMessage, turnstileToken: token, website },
      });
      if (error) throw error;

      toast({ title: "Bericht verzonden!", description: "We nemen zo snel mogelijk contact met je op." });
      setName("");
      setEmail("");
      setMessage("");
      setToken("");
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } catch {
      toast({
        title: "Verzenden mislukt",
        description: "Er ging iets mis. Probeer het later opnieuw.",
        variant: "destructive",
      });
      setToken("");
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-12 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Contact</CardTitle>
          <CardDescription>Heb je een vraag? Neem contact op!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Naam</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">Bericht</Label>
              <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required rows={4} />
            </div>

            {/* Honeypot — verborgen voor mensen, ingevuld door bots */}
            <div
              aria-hidden="true"
              style={{ position: "absolute", left: "-10000px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
            >
              <label htmlFor="website">Website (laat leeg)</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div ref={widgetRef} className="flex justify-center" />

            <Button type="submit" className="w-full" disabled={submitting || !token}>
              {submitting ? "Versturen..." : "Versturen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
