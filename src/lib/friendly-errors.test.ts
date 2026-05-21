import { describe, it, expect } from "vitest";
import { friendlyAuthError, friendlyDbError } from "./friendly-errors";

/**
 * Borgt dat error-messages NOOIT rauwe Postgres/Supabase-details lekken naar
 * de eindgebruiker. Elke nieuwe error-categorie moet hier een testcase krijgen
 * voordat die in productie mag.
 *
 * Onbekende fouten → generieke fallback (geen rauwe message).
 */

const GENERIC_FALLBACK = "Er ging iets mis. Probeer het opnieuw.";

describe("friendlyDbError", () => {
  it("vertaalt RLS-violation (code 42501) naar permissie-melding", () => {
    expect(
      friendlyDbError({
        message: 'new row violates row-level security policy for table "merchants"',
        code: "42501",
      }),
    ).toBe("Je hebt geen toestemming voor deze actie.");
  });

  it("vertaalt 'permission denied' message naar permissie-melding", () => {
    expect(
      friendlyDbError({ message: "permission denied for table deals", code: "42501" }),
    ).toBe("Je hebt geen toestemming voor deze actie.");
  });

  it("vertaalt PostgREST 301 (RLS) naar permissie-melding", () => {
    expect(friendlyDbError({ message: "anything", code: "PGRST301" })).toBe(
      "Je hebt geen toestemming voor deze actie.",
    );
  });

  it("vertaalt verlopen JWT naar sessie-melding", () => {
    expect(friendlyDbError({ message: "JWT expired" })).toBe(
      "Je sessie is verlopen. Log opnieuw in.",
    );
  });

  it("vertaalt unique-constraint (23505) zonder kolomnaam te lekken", () => {
    const out = friendlyDbError({
      message: 'duplicate key value violates unique constraint "profiles_email_key"',
      code: "23505",
    });
    expect(out).toBe("Dit bestaat al. Kies een andere waarde.");
    expect(out).not.toMatch(/profiles_email_key/);
  });

  it("vertaalt foreign-key violation (23503) zonder constraint-naam te lekken", () => {
    const out = friendlyDbError({
      message:
        'update or delete on table "deals" violates foreign key constraint "vouchers_deal_id_fkey"',
      code: "23503",
    });
    expect(out).toBe("Deze actie kan niet: er hangt nog gerelateerde data aan.");
    expect(out).not.toMatch(/vouchers_deal_id_fkey/);
  });

  it("vertaalt not-null violation (23502) zonder kolomnaam te lekken", () => {
    const out = friendlyDbError({
      message: 'null value in column "title" of relation "deals" violates not-null constraint',
      code: "23502",
    });
    expect(out).toBe("Een verplicht veld is leeg.");
    expect(out).not.toMatch(/column "title"/);
  });

  it("vertaalt check-constraint (23514) naar regels-melding", () => {
    expect(
      friendlyDbError({
        message: 'new row for relation "deals" violates check constraint "discount_range"',
        code: "23514",
      }),
    ).toBe("De ingevulde waarde voldoet niet aan de regels.");
  });

  it("vertaalt PostgREST 116 (no rows) naar niet-gevonden melding", () => {
    expect(friendlyDbError({ message: "JSON object requested, multiple rows", code: "PGRST116" })).toBe(
      "Niet gevonden of al verwijderd.",
    );
  });

  it("vertaalt netwerk-fout naar verbindingsmelding", () => {
    expect(friendlyDbError({ message: "Failed to fetch" })).toBe(
      "Geen verbinding. Controleer je internet en probeer opnieuw.",
    );
  });

  it("vertaalt rate-limit naar wachtmelding", () => {
    expect(friendlyDbError({ message: "Too many requests" })).toBe(
      "Te veel pogingen. Wacht even en probeer het opnieuw.",
    );
  });

  it("retourneert generieke fallback voor onbekende SQL-error (geen lek)", () => {
    const out = friendlyDbError({ message: "internal sql something XX999", code: "XX999" });
    expect(out).toBe(GENERIC_FALLBACK);
    expect(out).not.toMatch(/sql|XX999/i);
  });

  it("retourneert generieke fallback bij null/undefined", () => {
    expect(friendlyDbError(null)).toBe(GENERIC_FALLBACK);
    expect(friendlyDbError(undefined)).toBe(GENERIC_FALLBACK);
  });
});

describe("friendlyAuthError", () => {
  it("vertaalt invalid credentials naar Nederlandse melding", () => {
    expect(
      friendlyAuthError({ message: "Invalid login credentials", code: "invalid_credentials" }),
    ).toBe("E-mailadres of wachtwoord is onjuist.");
  });

  it("vertaalt email-not-confirmed naar verificatie-melding", () => {
    expect(
      friendlyAuthError({ message: "Email not confirmed", code: "email_not_confirmed" }),
    ).toBe("Je e-mailadres is nog niet bevestigd. Check je inbox voor de verificatielink.");
  });

  it("vertaalt 'user already registered' naar duidelijke melding", () => {
    expect(friendlyAuthError({ message: "User already registered" })).toBe(
      "Er bestaat al een account met dit e-mailadres. Log in of gebruik 'Wachtwoord vergeten'.",
    );
  });

  it("vertaalt zwak wachtwoord", () => {
    expect(
      friendlyAuthError({ message: "Password should be at least 8 characters", code: "weak_password" }),
    ).toBe("Wachtwoord is te zwak. Gebruik minimaal 8 tekens.");
  });

  it("vertaalt gelekt wachtwoord (HIBP)", () => {
    expect(
      friendlyAuthError({ message: "Password is known to be leaked", code: "weak_password" }),
    ).toBe("Dit wachtwoord komt voor in een bekende datalek. Kies een ander wachtwoord.");
    expect(
      friendlyAuthError({ message: "pwned password detected", code: "weak_password" }),
    ).toBe("Dit wachtwoord komt voor in een bekende datalek. Kies een ander wachtwoord.");
  });


  it("vertaalt ongeldig e-mailadres", () => {
    expect(friendlyAuthError({ message: "Unable to validate email address: invalid format" })).toBe(
      "Vul een geldig e-mailadres in.",
    );
  });

  it("vertaalt rate-limit (429)", () => {
    expect(friendlyAuthError({ message: "Too many requests", status: 429 })).toBe(
      "Te veel pogingen. Wacht even en probeer het opnieuw.",
    );
  });

  it("vertaalt 'for security purposes ... after N seconds' naar wachtmelding", () => {
    expect(
      friendlyAuthError({
        message: "For security purposes, you can only request this after 47 seconds",
      }),
    ).toBe("Je hebt zojuist een e-mail aangevraagd. Wacht een minuut en probeer opnieuw.");
  });

  it("vertaalt verlopen reset-link", () => {
    expect(friendlyAuthError({ message: "Token has expired or is invalid" })).toBe(
      "Deze link is verlopen of ongeldig. Vraag een nieuwe aan.",
    );
  });

  it("vertaalt 'same password' bij wachtwoord-reset", () => {
    expect(
      friendlyAuthError({ message: "New password should be different from the old password." }),
    ).toBe("Het nieuwe wachtwoord moet anders zijn dan het huidige.");
  });

  it("vertaalt netwerk-fout", () => {
    expect(friendlyAuthError({ message: "Failed to fetch" })).toBe(
      "Geen verbinding. Controleer je internet en probeer opnieuw.",
    );
  });

  it("retourneert generieke fallback voor onbekende fout", () => {
    expect(friendlyAuthError({ message: "Some weird auth internal error" })).toBe(GENERIC_FALLBACK);
  });

  it("retourneert generieke fallback bij null/undefined", () => {
    expect(friendlyAuthError(null)).toBe(GENERIC_FALLBACK);
    expect(friendlyAuthError(undefined)).toBe(GENERIC_FALLBACK);
  });
});
