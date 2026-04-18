/**
 * Gedeelde auth-helpers voor edge functions.
 *
 * Voorbeeld:
 *   import { requireUser, requireRole, requireCronSecret } from "../_shared/auth.ts";
 *
 *   const auth = await requireUser(req);
 *   if (auth instanceof Response) return auth; // 401 wordt al teruggegeven
 *   const userId = auth.userId;
 *
 *   const adminCheck = await requireRole(req, "admin");
 *   if (adminCheck instanceof Response) return adminCheck;
 *
 *   const cronCheck = requireCronSecret(req);
 *   if (cronCheck) return cronCheck; // 401 als header niet klopt
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AuthContext {
  userId: string;
  email?: string;
  client: SupabaseClient;
  /** Service-role client voor RLS-bypass (alleen role-checks etc.). */
  admin: SupabaseClient;
}

/**
 * Verifieert de Authorization header en geeft userId + clients terug.
 * Returnt een 401 Response als auth ontbreekt of ongeldig is.
 */
export async function requireUser(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Niet ingelogd" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return jsonResponse(500, { error: "Server config fout" });
  }

  const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user?.id) {
    return jsonResponse(401, { error: "Sessie ongeldig" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  return {
    userId: data.user.id,
    email: data.user.email ?? undefined,
    client: userClient,
    admin,
  };
}

/**
 * Vereist dat de gebruiker een specifieke rol heeft.
 * Returnt 401 (niet ingelogd) of 403 (verkeerde rol) als check faalt.
 */
export async function requireRole(
  req: Request,
  role: "consumer" | "merchant" | "admin",
): Promise<AuthContext | Response> {
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  const { data, error } = await auth.admin
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.userId)
    .eq("role", role)
    .maybeSingle();

  if (error) return jsonResponse(500, { error: "Rol-check faalt" });
  if (!data) return jsonResponse(403, { error: "Geen toegang" });

  return auth;
}

/**
 * Voor cron-only endpoints: vereist een geldige `x-cron-secret` header.
 * Gebruik dit voor functions die NIET door eindgebruikers mogen worden getriggerd
 * (bv. cleanup-jobs, periodieke aggregaties).
 *
 * Returnt undefined als check slaagt, anders een 401 Response.
 */
export function requireCronSecret(req: Request): Response | undefined {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    return jsonResponse(500, { error: "CRON_SECRET niet geconfigureerd" });
  }
  const provided = req.headers.get("x-cron-secret");
  if (!provided || provided !== expected) {
    return jsonResponse(401, { error: "Ongeldig cron-secret" });
  }
  return undefined;
}
