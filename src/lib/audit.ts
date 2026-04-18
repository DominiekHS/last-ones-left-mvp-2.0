/**
 * Client-side audit helpers.
 *
 * - `logAuthEvent` roept de publieke `log-auth-event` edge function aan.
 *   Voor login/password-reset failures vanaf de browser.
 * - `recordAdminAction` schrijft naar de bestaande `admin_actions` tabel
 *   (RLS dwingt admin-rol af).
 * - `recordAuditEvent` schrijft direct naar `audit_log` als de gebruiker
 *   ingelogd is (deal_published, etc.).
 *
 * Faalt SILENT — audit-fouten mogen nooit een user-flow breken.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditSeverity = "info" | "warn" | "error";

interface AuthEventPayload {
  event_name: "AUTH_LOGIN_FAILED" | "AUTH_PASSWORD_RESET_REQUESTED" | "AUTH_SIGNUP_FAILED";
  reason?: string;
  email_length?: number;
}

/** Roep edge function aan zodat IP-hash server-side wordt berekend. */
export async function logAuthEvent(payload: AuthEventPayload): Promise<void> {
  try {
    await supabase.functions.invoke("log-auth-event", { body: payload });
  } catch (e) {
    // Geen throw — audit mag flow nooit breken.
    if (import.meta.env.DEV) console.warn("[audit] logAuthEvent failed", e);
  }
}

interface AuditEventPayload {
  event_name: string;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
}

/** Direct insert in audit_log; vereist ingelogde gebruiker (RLS check). */
export async function recordAuditEvent(payload: AuditEventPayload): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("audit_log").insert([{
      event_name: payload.event_name,
      severity: payload.severity ?? "info",
      user_id: user.id,
      metadata: (payload.metadata ?? {}) as Json,
    }]);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[audit] recordAuditEvent failed", e);
  }
}

interface AdminActionPayload {
  action_type: string;
  target_type: string;
  target_id: string;
  reason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/** Logt een admin moderation actie. RLS dwingt admin-rol af. */
export async function recordAdminAction(payload: AdminActionPayload): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("admin_actions").insert([{
      admin_id: user.id,
      action_type: payload.action_type,
      target_type: payload.target_type,
      target_id: payload.target_id,
      reason: payload.reason ?? null,
      notes: payload.notes ?? null,
      metadata: (payload.metadata ?? {}) as Json,
    }]);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[audit] recordAdminAction failed", e);
  }
}
