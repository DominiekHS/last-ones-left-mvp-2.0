/**
 * Gedeelde input-validatie voor edge functions.
 *
 * Gebruik:
 *   import { z, parseJsonBody, validationError } from "../_shared/validation.ts";
 *
 *   const Schema = z.object({ email: z.string().email() }).strict();
 *   const parsed = await parseJsonBody(req, Schema);
 *   if (parsed instanceof Response) return parsed; // 400 / 413 al teruggegeven
 *   const { email } = parsed;
 *
 * Beleid:
 *  - Body-size limiet: 100KB (voor JSON edge functions ruim voldoende).
 *  - `.strict()` op schema's → onbekende velden worden geweigerd (overposting).
 *  - 400-response shape: { error: "VALIDATION_ERROR", fields: { veld: "msg" } }.
 *  - Geen interne stack traces / SQL fouten naar client.
 */
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders } from "./auth.ts";

export { z };

const MAX_BODY_BYTES = 100 * 1024; // 100KB

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function validationError(
  fields: Record<string, string>,
): Response {
  return jsonResponse(400, { error: "VALIDATION_ERROR", fields });
}

/**
 * Leest de body als tekst (met size cap), parsed JSON, en valideert tegen het schema.
 * Returnt het geparsede object óf een 400/413 Response.
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T> | Response> {
  // 1. Body-size guard. Lees als text om grootte te checken voordat we JSON parsen.
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return jsonResponse(400, { error: "VALIDATION_ERROR", fields: { _: "Body niet leesbaar" } });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return jsonResponse(413, {
      error: "PAYLOAD_TOO_LARGE",
      fields: { _: `Body groter dan ${MAX_BODY_BYTES} bytes` },
    });
  }

  // 2. JSON parse
  let json: unknown;
  try {
    json = raw.length === 0 ? {} : JSON.parse(raw);
  } catch {
    return jsonResponse(400, { error: "VALIDATION_ERROR", fields: { _: "Ongeldige JSON" } });
  }

  // 3. Schema-validatie
  const result = schema.safeParse(json);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "_";
      // Eerste fout per veld is genoeg voor UI.
      if (!fields[path]) fields[path] = issue.message;
    }
    return validationError(fields);
  }
  return result.data;
}
