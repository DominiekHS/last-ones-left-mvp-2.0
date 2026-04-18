/**
 * log-auth-event — Publiek endpoint voor auth-failure events vanaf de client.
 *
 * Doel: brute-force detectie en password-reset-spike alerts.
 *
 * Beveiliging:
 * - Alleen een vaste, kleine whitelist van event_names toegestaan.
 * - IP wordt gehasht (SHA-256 → 128 bits) — geen raw IP in DB.
 * - email wordt nooit opgeslagen, alleen email_length voor sanity checks.
 * - Body-size hard gecapt op 1 KB.
 * - Service-role insert; RLS-policy op audit_log staat ook anon insert toe
 *   maar via service-role omzeilen we toekomstige tightenings.
 */
import { recordAuditEvent } from "../_shared/audit.ts";
import { createLogger, getClientIp, hashIp } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EVENTS = new Set([
  "AUTH_LOGIN_FAILED",
  "AUTH_PASSWORD_RESET_REQUESTED",
  "AUTH_SIGNUP_FAILED",
]);

interface Body {
  event_name: string;
  reason?: string;
  email_length?: number;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const log = createLogger("log-auth-event", req);

  // Body-size cap (DoS-bescherming).
  const cl = req.headers.get("content-length");
  if (cl && parseInt(cl, 10) > 1024) {
    return json(413, { error: "Payload too large" });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (!body.event_name || !ALLOWED_EVENTS.has(body.event_name)) {
    log.warn("AUDIT_INVALID_EVENT", { received: String(body.event_name).slice(0, 50) });
    return json(400, { error: "Invalid event_name" });
  }

  const ip = getClientIp(req);
  const ip_hash = ip ? await hashIp(ip) : null;

  await recordAuditEvent({
    event_name: body.event_name,
    severity: "warn",
    ip_hash,
    endpoint: "/auth/client",
    request_id: log.context.request_id,
    metadata: {
      reason: typeof body.reason === "string" ? body.reason.slice(0, 100) : undefined,
      email_length: typeof body.email_length === "number" ? body.email_length : undefined,
      user_agent: req.headers.get("user-agent")?.slice(0, 200),
    },
  });

  return json(200, { ok: true, request_id: log.context.request_id });
});
