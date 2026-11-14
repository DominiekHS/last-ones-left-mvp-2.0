import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { friendlyAuthError } from "@/lib/friendly-errors";
import { useAppSetting } from "@/hooks/useAppSettings";
import { Eye, EyeOff } from "lucide-react";
import { NotificationPreferenceFields } from "@/components/consumer/NotificationPreferenceFields";
import { useNotificationChoices } from "@/hooks/useNotificationChoices";
import { hasAvailablePreference, type NotificationChoice } from "@/lib/notification-preferences";

export default function Register() {
  const [notificationChoice, setNotificationChoice] = useState<NotificationChoice | "">("");
  const [notificationCategories, setNotificationCategories] = useState<string[]>([]);
  const [notificationMerchants, setNotificationMerchants] = useState<string[]>([]);
  const { data: notificationChoices } = useNotificationChoices();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: verificationSetting } = useAppSetting("email_verification_required");
  // Standaard veilig: verificatie vereist, tenzij expliciet uitgezet door een admin.
  const verificationRequired = verificationSetting?.value !== false;

  // Pak referral-code uit ?ref= en bewaar in sessionStorage zodat hij blijft na navigatie.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("ll_referral_code", ref.toUpperCase());
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Registratie mislukt", description: "Wachtwoord is te zwak. Gebruik minimaal 8 tekens.", variant: "destructive" });
      return;
    }
    if (!notificationChoice || (notificationChoice === "personal" && !hasAvailablePreference({ notification_categories: notificationCategories, notification_merchants: notificationMerchants }, notificationChoices || []))) {
      toast({ title: "Kies je meldingsvoorkeur", description: "Kies bij persoonlijke meldingen minimaal één beschikbare activiteit of één bedrijf.", variant: "destructive" });
      return;
    }
    const notificationMetadata = {
      notification_choice: notificationChoice,
      notification_categories: notificationCategories,
      notification_merchants: notificationMerchants,
    };
    setLoading(true);

    const referralCode = sessionStorage.getItem("ll_referral_code") || undefined;

    // Verificatie uitgeschakeld (bv. tijdens een markt): account direct actief aanmaken en inloggen.
    if (!verificationRequired) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("consumer-signup", {
        body: {
          ...notificationMetadata,
          email,
          password,
          full_name: fullName,
          phone: phone || null,
          date_of_birth: dob || null,
          referral_code: referralCode || null,
        },
      });

      const fnErrMessage = (fnData as any)?.error;
      if (fnError || fnErrMessage) {
        toast({
          title: "Registratie mislukt",
          description: fnErrMessage || fnError?.message || "Er ging iets mis.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        toast({ title: "Account aangemaakt", description: "Log in met je e-mailadres en wachtwoord." });
        navigate("/login");
        setLoading(false);
        return;
      }

      toast({ title: "Account aangemaakt!", description: "Je bent direct ingelogd." });
      navigate("/");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { ...notificationMetadata, full_name: fullName, phone, role: "consumer", referral_code: referralCode, date_of_birth: dob || null },
      },
    });

    if (error) {
      toast({ title: "Registratie mislukt", description: friendlyAuthError(error), variant: "destructive" });
      setLoading(false);
      return;
    }

    // Rol wordt automatisch toegekend via de handle_new_user DB-trigger.


    toast({
      title: "Account aangemaakt!",
      description: "Controleer je e-mail om je account te verifiëren.",
    });
    navigate("/verify-email");
    setLoading(false);
  };


  return (
    <div className="container flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Account aanmaken</CardTitle>
          <CardDescription>Binnen 1 minuut deals claimen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-muted-foreground">* Verplicht veld</p>
            <div className="space-y-2">
              <Label htmlFor="name">Volledige naam *</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Geboortedatum</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <fieldset className="space-y-3 border-t pt-4" disabled={loading}>
              <legend className="sr-only">Meldingsvoorkeuren *</legend>
              <NotificationPreferenceFields registration choice={notificationChoice} categories={notificationCategories} merchants={notificationMerchants} onChoice={setNotificationChoice} onCategories={setNotificationCategories} onMerchants={setNotificationMerchants} disabled={loading} />
            </fieldset>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Bezig..." : "Registreren"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Al een account?{" "}
            <Link to="/login" className="text-foreground underline">Inloggen</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
