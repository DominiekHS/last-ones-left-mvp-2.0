import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CATEGORY_LABELS } from "@/lib/constants";

const RATE_LIMIT_KEY = "lol_activity_request_log";
const MAX_PER_DAY = 3;

function checkRateLimit(): boolean {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const list: number[] = raw ? JSON.parse(raw) : [];
    const recent = list.filter((t) => t > dayAgo);
    if (recent.length >= MAX_PER_DAY) return false;
    recent.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    return true;
  } catch {
    return true;
  }
}

const schema = z.object({
  message: z.string().trim().min(2, "Minimaal 2 tekens").max(300, "Maximaal 300 tekens"),
});

interface Props {
  contextCity?: string;
  contextCategory?: string;
  contextDayFilter?: string;
}

export function ActivityRequestDialog({ contextCity, contextCategory, contextDayFilter }: Props) {
  const { user, profile, roles } = useAuth();
  const isConsumer = roles.includes("consumer");

  // Niet ingelogd: toon login-knop
  if (!user) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Log in als consument om een voorkeur door te geven.
        </p>
        <Button asChild size="lg">
          <Link to="/login">Inloggen</Link>
        </Button>
      </div>
    );
  }

  // Ingelogd maar geen consument: niets tonen of melding
  if (!isConsumer) {
    return (
      <p className="text-sm text-muted-foreground">
        Alleen consumenten-accounts kunnen voorkeuren doorgeven.
      </p>
    );
  }

  return <ActivityRequestForm contextCity={contextCity} contextCategory={contextCategory} contextDayFilter={contextDayFilter} user={user} profile={profile} />;
}

function ActivityRequestForm({ contextCity, contextCategory, contextDayFilter, user, profile }: Props & { user: any; profile: any }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [city, setCity] = useState(contextCity || "");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setMessage("");
    setCity(contextCity || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ message });
    if (!parsed.success) {
      toast({ title: "Controleer je invoer", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    if (!checkRateLimit()) {
      toast({
        title: "Even wachten",
        description: "Je hebt vandaag al meerdere voorkeuren ingestuurd. Probeer het morgen opnieuw.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const categoryLabel = contextCategory && contextCategory !== "all"
      ? (CATEGORY_LABELS[contextCategory as keyof typeof CATEGORY_LABELS] || contextCategory)
      : null;

    const { error } = await supabase.from("activity_requests").insert({
      message: parsed.data.message,
      user_id: user?.id ?? null,
      user_email: profile?.email ?? null,
      context_city: city.trim() || null,
      context_category: categoryLabel,
      context_day_filter: contextDayFilter && contextDayFilter !== "all" ? contextDayFilter : null,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Er ging iets mis", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Bedankt!", description: "We nemen je voorkeur mee." });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Voorkeur doorgeven
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welke activiteit zoek je?</DialogTitle>
          <DialogDescription>
            Mis je een activiteit? Laat het ons weten — dan proberen we meer deals zoals dit te regelen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Activiteit *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bijv. 'Bowlen', 'Escape room', 'Concert in Groningen'…"
              maxLength={300}
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/300</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Plaats (optioneel)</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bijv. Amsterdam"
              maxLength={100}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Versturen…" : "Versturen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
