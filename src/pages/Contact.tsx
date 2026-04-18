import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-message", {
        body: { name: trimmedName, email: trimmedEmail, message: trimmedMessage },
      });
      if (error) throw error;

      toast({ title: "Bericht verzonden!", description: "We nemen zo snel mogelijk contact met je op." });
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      toast({
        title: "Verzenden mislukt",
        description: "Er ging iets mis. Probeer het later opnieuw.",
        variant: "destructive",
      });
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Versturen..." : "Versturen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
