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
  if (raw.includes("pwned") || raw.includes("leaked") || raw.includes("compromised")) {
    return "Dit wachtwoord komt voor in een bekende datalek. Kies een ander wachtwoord.";
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

/**
 * Vertaalt Supabase/PostgREST DB-fouten naar korte Nederlandse teksten.
 * Voorkomt dat interne kolomnamen, SQL-foutcodes of RLS-policy-namen
 * via toasts naar de eindgebruiker lekken.
 *
 * Gebruik:
 *   const { error } = await supabase.from("deals").update(...);
 *   if (error) toast({ description: friendlyDbError(error) });
 *
 * Onbekende fouten → generieke fallback (geen rauwe message naar gebruiker).
 */
type DbLikeError =
  | { message?: string; code?: string; details?: string; hint?: string }
  | null
  | undefined;

export function friendlyDbError(error: DbLikeError): string {
  if (!error) return "Er ging iets mis. Probeer het opnieuw.";
  const raw = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  // Permissions / RLS
  if (
    raw.includes("row-level security") ||
    raw.includes("violates row-level") ||
    raw.includes("permission denied") ||
    code === "42501" ||
    code === "pgrst301"
  ) {
    return "Je hebt geen toestemming voor deze actie.";
  }

  // Auth missing
  if (raw.includes("jwt") || raw.includes("not authenticated") || code === "pgrst302") {
    return "Je sessie is verlopen. Log opnieuw in.";
  }

  // Unique constraint
  if (raw.includes("duplicate key") || raw.includes("unique constraint") || code === "23505") {
    return "Dit bestaat al. Kies een andere waarde.";
  }

  // Foreign key
  if (raw.includes("foreign key") || code === "23503") {
    return "Deze actie kan niet: er hangt nog gerelateerde data aan.";
  }

  // Not null / required
  if (raw.includes("null value") || raw.includes("not-null") || code === "23502") {
    return "Een verplicht veld is leeg.";
  }

  // Check constraint / trigger validation
  if (raw.includes("violates check constraint") || code === "23514") {
    return "De ingevulde waarde voldoet niet aan de regels.";
  }

  // Not found
  if (code === "pgrst116" || raw.includes("no rows")) {
    return "Niet gevonden of al verwijderd.";
  }

  // Network
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Geen verbinding. Controleer je internet en probeer opnieuw.";
  }

  // Rate limit
  if (raw.includes("rate limit") || raw.includes("too many requests")) {
    return "Te veel pogingen. Wacht even en probeer het opnieuw.";
  }

  return "Er ging iets mis. Probeer het opnieuw.";
}
