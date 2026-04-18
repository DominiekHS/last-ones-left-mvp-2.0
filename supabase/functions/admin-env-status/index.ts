// Admin-only edge function: rapporteert of alle vereiste secrets en
// services correct geconfigureerd zijn. Toont GEEN waardes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { hasEnv, requireEnv } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ServiceCheck {
  key: string;
  name: string;
  status: "ok" | "missing" | "unknown";
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Auth: alleen ingelogde admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv([
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const);

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Geen toegang" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verzamel checks
    const checks: ServiceCheck[] = [
      {
        key: "SUPABASE_URL",
        name: "Database verbinding",
        status: hasEnv("SUPABASE_URL") ? "ok" : "missing",
        description: "URL waarmee edge functions de database benaderen.",
      },
      {
        key: "SUPABASE_SERVICE_ROLE_KEY",
        name: "Database admin-rechten",
        status: hasEnv("SUPABASE_SERVICE_ROLE_KEY") ? "ok" : "missing",
        description:
          "Server-only key waarmee edge functions RLS kunnen passeren.",
      },
      {
        key: "LOVABLE_API_KEY",
        name: "Lovable AI Gateway",
        status: hasEnv("LOVABLE_API_KEY") ? "ok" : "missing",
        description:
          "Authenticatie voor de Lovable connector-gateway (gebruikt door Resend-mail).",
      },
      {
        key: "RESEND_API_KEY",
        name: "E-mail verzenden (Resend)",
        status: hasEnv("RESEND_API_KEY") ? "ok" : "missing",
        description:
          "API key voor het versturen van contactformulier- en notificatiemails.",
      },
    ];

    // 3. Database self-test
    let dbCheck: ServiceCheck = {
      key: "DB_QUERY",
      name: "Database query test",
      status: "unknown",
      description: "Voert een lichte SELECT uit om te bevestigen dat de DB bereikbaar is.",
    };
    try {
      const { error } = await admin.from("app_settings").select("key").limit(1);
      dbCheck.status = error ? "missing" : "ok";
      if (error) dbCheck.description += ` Fout: ${error.message}`;
    } catch (e) {
      dbCheck.status = "missing";
      dbCheck.description += ` Fout: ${(e as Error).message}`;
    }
    checks.push(dbCheck);

    // 4. Mask Supabase URL voor weergave (alleen host, niet pad)
    const maskedHost = (() => {
      try {
        return new URL(SUPABASE_URL).host;
      } catch {
        return "unknown";
      }
    })();

    const summary = {
      ok: checks.every((c) => c.status === "ok"),
      project_host: maskedHost,
      checked_at: new Date().toISOString(),
      checks,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-env-status error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
