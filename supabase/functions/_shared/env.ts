/**
 * Gedeelde env-validation helper voor edge functions.
 *
 * Gebruik aan de top van een edge function:
 *
 *   import { requireEnv } from "../_shared/env.ts";
 *   const { RESEND_API_KEY, LOVABLE_API_KEY } = requireEnv(
 *     ["RESEND_API_KEY", "LOVABLE_API_KEY"],
 *   );
 *
 * Gooit een duidelijke error als één of meer keys ontbreken — zo
 * faalt de function direct met een eenduidige melding in plaats van
 * een mysterieuze "undefined" verderop.
 */

export class MissingEnvError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(
      `Missende environment variables: ${missing.join(", ")}. ` +
        `Configureer deze in Lovable Cloud → Edge functions → Secrets.`,
    );
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

export function requireEnv<K extends string>(
  keys: readonly K[],
): Record<K, string> {
  const out = {} as Record<K, string>;
  const missing: string[] = [];
  for (const k of keys) {
    const v = Deno.env.get(k);
    if (!v) missing.push(k);
    else out[k] = v;
  }
  if (missing.length) throw new MissingEnvError(missing);
  return out;
}

/** Returnt of een env var aanwezig en niet-leeg is. Geen throw. */
export function hasEnv(key: string): boolean {
  const v = Deno.env.get(key);
  return typeof v === "string" && v.length > 0;
}
