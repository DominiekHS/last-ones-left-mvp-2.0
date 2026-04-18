/**
 * Vertaalt Supabase auth-foutmeldingen (Engels, soms tech-taal) naar
 * korte Nederlandse user-friendly teksten.
 *
 * Gebruik:
 *   const { error } = await supabase.auth.signInWithPassword(...);
 *   if (error) toast({ description: friendlyAuthError(error) });
 *
 * Onbekende fouten → generieke fallback (geen rauwe message naar gebruiker).
 */
type AuthLikeError = { message?: string; code?: string; status?: number } | null | undefined;

export function friendlyAuthError(error: AuthLikeError): string {
  if (!error) return "Er ging iets mis. Probeer het opnieuw.";
  const raw = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  // Login
  if (raw.includes("invalid login credentials") || code === "invalid_credentials") {
    return "E-mailadres of wachtwoord is onjuist.";
  }
  if (raw.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Je e-mailadres is nog niet bevestigd. Check je inbox voor de verificatielink.";
  }

  // Signup
  if (raw.includes("user already registered") || raw.includes("already been registered") || code === "user_already_exists") {
    return "Er bestaat al een account met dit e-mailadres. Log in of gebruik 'Wachtwoord vergeten'.";
  }
  if (raw.includes("password should be at least") || code === "weak_password") {
    return "Wachtwoord is te zwak. Gebruik minimaal 8 tekens.";
  }
  if (raw.includes("unable to validate email") || raw.includes("invalid email")) {
    return "Vul een geldig e-mailadres in.";
  }

  // Rate limiting / resend
  if (raw.includes("rate limit") || raw.includes("too many requests") || error.status === 429) {
    return "Te veel pogingen. Wacht even en probeer het opnieuw.";
  }
  if (raw.includes("for security purposes") && raw.includes("after")) {
    return "Je hebt zojuist een e-mail aangevraagd. Wacht een minuut en probeer opnieuw.";
  }

  // Reset / recovery
  if (raw.includes("token has expired") || raw.includes("link is invalid") || raw.includes("expired")) {
    return "Deze link is verlopen of ongeldig. Vraag een nieuwe aan.";
  }
  if (raw.includes("same password") || raw.includes("new password should be different")) {
    return "Het nieuwe wachtwoord moet anders zijn dan het huidige.";
  }

  // Network
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Geen verbinding. Controleer je internet en probeer opnieuw.";
  }

  return "Er ging iets mis. Probeer het opnieuw.";
}
