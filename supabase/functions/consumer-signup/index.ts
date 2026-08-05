import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z, parseJsonBody } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SignupSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres").max(254),
  password: z.string().min(8, "Wachtwoord minimaal 8 tekens").max(200),
  full_name: z.string().trim().min(1, "Naam verplicht").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  date_of_birth: z.string().trim().max(20).optional().nullable(),
  referral_code: z.string().trim().max(20).optional().nullable(),
}).strict();

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const parsed = await parseJsonBody(req, SignupSchema);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Feature flag: alleen toegestaan als e-mailverificatie tijdelijk uitstaat.
  const { data: setting, error: settingErr } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "email_verification_required")
    .maybeSingle();
  if (settingErr) return bad(500, "Settings error");
  if (setting?.value === true || setting == null) {
    return bad(403, "E-mailverificatie is vereist");
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.full_name,
      phone: body.phone ?? undefined,
      role: "consumer",
      referral_code: body.referral_code ?? undefined,
    },
  });
  if (createErr || !created?.user) {
    return bad(400, createErr?.message || "Kon account niet aanmaken");
  }

  if (body.date_of_birth) {
    await admin
      .from("profiles")
      .update({ date_of_birth: body.date_of_birth })
      .eq("user_id", created.user.id);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
