/**
 * Structured JSON logger voor edge functions.
 *
 * Output gaat naar `console.log` als single-line JSON, zodat Lovable Cloud
 * (Supabase) analytics_query er direct queries op kan draaien:
 *
 *   select event_message from function_logs
 *   where event_message like '%"event_name":"AUTH_LOGIN_FAILED"%'
 *
 * NOOIT raw IPs, secrets, JWTs of e-mailadressen loggen — alleen metadata
 * en hashes. Zie SECURITY.md.
 *
 * Voorbeeld:
 *   const log = createLogger("merchant-signup", req);
 *   log.info("SIGNUP_ATTEMPT", { company_name_length: name.length });
 *   log.warn("RATE_LIMIT_HIT", { endpoint: "/signup" });
 *   log.error("SIGNUP_FAILED", { reason: "duplicate_email" });
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  endpoint: string;
  request_id: string;
  user_id?: string;
  role?: string;
  ip_hash?: string;
}

export interface Logger {
  info: (event_name: string, metadata?: Record<string, unknown>) => void;
  warn: (event_name: string, metadata?: Record<string, unknown>) => void;
  error: (event_name: string, metadata?: Record<string, unknown>) => void;
  withUser: (user_id: string, role?: string) => Logger;
  context: LogContext;
}

/** Stable hash voor IP-adressen — geen reverse lookup mogelijk. */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .slice(0, 16) // 128 bits is genoeg voor brute-force detectie
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Haal client-IP uit request headers (Supabase / Cloudflare). */
export function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

/** Genereer een korte request_id voor log-correlatie. */
export function newRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/** Velden die NOOIT in logs mogen verschijnen, ook niet in metadata. */
const FORBIDDEN_KEYS = new Set([
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "service_role",
  "service_role_key",
  "email", // gebruik een email_hash of length-only indien nodig
]);

function scrub(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else if (typeof v === "string" && v.length > 500) {
      // Voorkom dat per ongeluk hele response bodies in logs belanden.
      out[k] = `[truncated ${v.length} chars]`;
    } else {
      out[k] = scrub(v);
    }
  }
  return out;
}

function emit(level: LogLevel, ctx: LogContext, event_name: string, metadata?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event_name,
    ...ctx,
    metadata: scrub(metadata ?? {}),
  };
  // Single-line JSON → makkelijk te grep'en in analytics_query.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(endpoint: string, req: Request): Logger {
  const ctx: LogContext = {
    endpoint,
    request_id: req.headers.get("x-request-id") ?? newRequestId(),
  };

  const make = (context: LogContext): Logger => ({
    context,
    info: (e, m) => emit("info", context, e, m),
    warn: (e, m) => emit("warn", context, e, m),
    error: (e, m) => emit("error", context, e, m),
    withUser: (user_id, role) => make({ ...context, user_id, role }),
  });

  return make(ctx);
}
