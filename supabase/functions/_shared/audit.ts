/**
 * Audit-log helpers voor edge functions.
 *
 * Schrijft naar `public.audit_log` (append-only). Gebruikt service-role
 * client zodat we ook anonymous events (login-failures) kunnen loggen
 * zonder de RLS-grootte-beperkingen die op anon-inserts gelden.
 *
 * Faalt SILENT — een mislukte audit-log mag nooit een user-flow breken.
 * Output gaat in dat geval naar console.error zodat het in Lovable Cloud
 * logs zichtbaar blijft.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AuditSeverity = "info" | "warn" | "error";

export interface AuditEvent {
  event_name: string;
  severity?: AuditSeverity;
  user_id?: string | null;
  role?: string | null;
  ip_hash?: string | null;
  endpoint?: string | null;
  request_id?: string | null;
  status_code?: number | null;
  metadata?: Record<string, unknown>;
}

let cachedAdmin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key);
  return cachedAdmin;
}

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const admin = getAdmin();
    if (!admin) {
      console.error("[audit] SUPABASE_SERVICE_ROLE_KEY missing, skipping insert");
      return;
    }
    const { error } = await admin.from("audit_log").insert({
      event_name: event.event_name,
      severity: event.severity ?? "info",
      user_id: event.user_id ?? null,
      role: event.role ?? null,
      ip_hash: event.ip_hash ?? null,
      endpoint: event.endpoint ?? null,
      request_id: event.request_id ?? null,
      status_code: event.status_code ?? null,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.error("[audit] insert failed", error.message);
    }
  } catch (e) {
    console.error("[audit] unexpected", e instanceof Error ? e.message : String(e));
  }
}
