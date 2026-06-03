import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { z, parseJsonBody } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Vaste lijst venue_types — moet matchen met enum public.venue_category.
const VENUE_TYPES = [
  "bioscoop", "theater", "sport", "museum", "bowling", "klimbos",
  "escaperoom", "arcade", "verhuur", "paintball", "concert", "voetbal",
  "basketbal", "overig", "jeu_de_boules", "shuffleboard", "boulderen",
  "pitch_putt", "voet_darts", "voetgolf", "minigolf", "padel",
  "pickleball", "tennis", "karten", "pool", "airhockey", "darts", "rondvaart", "workshop", "cocktail_walk", "bierproeverij", "indoor_golf",
] as const;

const SignupSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres").max(254),
  password: z.string().min(8, "Wachtwoord minimaal 8 tekens").max(200),
  company_name: z.string().trim().min(1, "Bedrijfsnaam verplicht").max(200),
  venue_type: z.enum(VENUE_TYPES, { errorMap: () => ({ message: "Ongeldig venue type" }) }),
  address: z.string().trim().min(1, "Adres verplicht").max(300),
  postcode: z.string().trim().min(1, "Postcode verplicht").max(20),
  city: z.string().trim().min(1, "Plaats verplicht").max(100),
  contact_phone: z.string().trim().max(40).optional().nullable(),
}).strict();

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const parsed = await parseJsonBody(req, SignupSchema);
  if (parsed instanceof Response) return parsed;
  const body = parsed;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check feature flag
  const { data: setting, error: settingErr } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "merchant_signup_enabled")
    .maybeSingle();
  if (settingErr) return bad(500, "Settings error");
  if (setting?.value !== true) {
    return bad(403, "Merchant signup disabled");
  }

  // Create user as confirmed while e-mail verification is tijdelijk uitgeschakeld voor testen.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.company_name },
  });
  if (createErr || !created?.user) {
    return bad(400, createErr?.message || "Could not create user");
  }
  const userId = created.user.id;

  // Assign merchant role
  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role: "merchant" });
  if (roleErr) {
    await admin.auth.admin.deleteUser(userId);
    return bad(500, "Could not assign role");
  }

  // Create merchant record
  const { error: merchantErr } = await admin.from("merchants").insert({
    user_id: userId,
    company_name: body.company_name,
    venue_type: body.venue_type,
    address: body.address,
    postcode: body.postcode,
    city: body.city,
    contact_phone: body.contact_phone || null,
  });
  if (merchantErr) {
    console.error("merchant-signup: insert merchants failed", merchantErr);
    await admin.auth.admin.deleteUser(userId);
    return bad(500, "Account aanmaken mislukt. Probeer opnieuw.");
  }

  return new Response(JSON.stringify({ ok: true, user_id: userId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
