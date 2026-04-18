import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupBody {
  email: string;
  password: string;
  company_name: string;
  venue_type: string;
  address: string;
  postcode: string;
  city: string;
  contact_phone?: string | null;
}

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

  let body: SignupBody;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }

  const required = ["email", "password", "company_name", "venue_type", "address", "postcode", "city"] as const;
  for (const k of required) {
    if (!body[k] || typeof body[k] !== "string") return bad(400, `Missing field: ${k}`);
  }
  if (body.password.length < 6) return bad(400, "Password too short");

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

  // Create user (sends verification email by default since we don't pass email_confirm:true)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: false,
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
    await admin.auth.admin.deleteUser(userId);
    return bad(500, merchantErr.message);
  }

  // Trigger email verification by generating a signup link via inviting?
  // Simpler: rely on standard signUp follow-up — send magic verification.
  // Use generateLink to send the confirmation email.
  await admin.auth.admin.generateLink({
    type: "signup",
    email: body.email,
    password: body.password,
  });

  return new Response(JSON.stringify({ ok: true, user_id: userId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
