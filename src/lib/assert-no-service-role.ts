/**
 * Runtime guard — faalt hard als per ongeluk een Supabase service_role key
 * (of een variant daarvan) als VITE_-env naar de browser is gepubliceerd.
 *
 * De service_role key omzeilt ALLE RLS policies. Hij hoort uitsluitend in
 * edge functions thuis, gelezen via `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`.
 *
 * Build-time vangen we dit al af met:
 *   - scripts/scan-source-secrets.mjs (vóór commit/build)
 *   - scripts/scan-bundle-secrets.mjs (na build, vóór deploy)
 *
 * Deze runtime-check is de "belt & suspenders" laag: als beide build-checks
 * ooit gefaald hebben en er tóch een key in de bundle terechtkomt, faalt de
 * app meteen luid bij het opstarten in plaats van stilletjes door te draaien.
 */

// Strings worden opgebouwd uit fragmenten zodat de bundle-scanner
// (scripts/scan-bundle-secrets.mjs) deze guard niet zelf vlagt als
// "secret in bundle" — het ZIJN namelijk de detectie-patronen.
const SR = "SERVICE" + "_ROLE";
const FORBIDDEN_KEY_NAMES = [
  `VITE_SUPABASE_${SR}_KEY`,
  `VITE_${SR}_KEY`,
  "VITE_SUPABASE_SERVICE_KEY",
  `SUPABASE_${SR}_KEY`, // mag nooit via import.meta.env exposed zijn
];

// Detecteert het base64-encoded payload-fragment `"role":"service_role"` in
// een JWT — uniek voor service_role keys, komt nooit voor in een anon key.
// Opgesplitst in twee delen om bundle-scanner false-positive te vermijden.
const SERVICE_ROLE_JWT_MARKER = "InJvbGUiOiJ" + "zZXJ2aWNlX3JvbGUi";

export function assertNoServiceRoleInClient(): void {
  const env = (import.meta as ImportMeta).env as Record<string, unknown>;

  for (const name of FORBIDDEN_KEY_NAMES) {
    const value = env[name];
    if (typeof value === "string" && value.length > 0) {
      throw new Error(
        `[SECURITY] Verboden environment variable in client bundle: "${name}". ` +
          `De Supabase service_role key mag NOOIT in de browser zichtbaar zijn — ` +
          `hij omzeilt alle RLS policies. Verwijder de key uit je build-config en ` +
          `roteer hem onmiddellijk in Lovable Cloud → Database → API keys.`,
      );
    }
  }

  // Scan álle VITE_-vars op het JWT-payload patroon van een service_role key.
  // Vangt het geval waarin de key onder een onverwachte naam is gezet.
  for (const [name, value] of Object.entries(env)) {
    if (typeof value !== "string") continue;
    if (value.includes(SERVICE_ROLE_JWT_MARKER)) {
      throw new Error(
        `[SECURITY] De env var "${name}" bevat een Supabase service_role JWT. ` +
          `Deze key omzeilt RLS en mag NOOIT in de client bundle. Verwijder hem ` +
          `en roteer de key direct in Lovable Cloud → Database → API keys.`,
      );
    }
  }
}
