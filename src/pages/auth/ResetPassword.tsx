import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event (fired when arriving via reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // Fallback: if a session already exists (e.g. event fired before listener
    // attached, or user already authenticated via the recovery link), proceed.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    // Final fallback: after 3s, allow the form anyway so the user can try.
    const timeout = setTimeout(() => setReady(true), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Fout", description: "Wachtwoorden komen niet overeen.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Fout", description: "Wachtwoord moet minimaal 8 tekens bevatten.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Fout", description: friendlyAuthError(error), variant: "destructive" });
    } else {
      toast({ title: "Gelukt!", description: "Je wachtwoord is gewijzigd. Je kunt nu inloggen." });
      await supabase.auth.signOut();
      navigate("/login");
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="container flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-2xl">Wachtwoord resetten</CardTitle>
            <CardDescription>Even geduld, we verifiëren je resetlink…</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Nieuw wachtwoord instellen</CardTitle>
          <CardDescription>Kies een nieuw wachtwoord voor je account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nieuw wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Minimaal 8 tekens"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Herhaal wachtwoord</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Bezig..." : "Wachtwoord instellen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
