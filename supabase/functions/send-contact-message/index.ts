import { z, parseJsonBody } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const RECIPIENT = "contactlastonesleft@gmail.com";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Naam verplicht").max(100, "Naam te lang"),
  email: z.string().trim().email("Ongeldig e-mailadres").max(254),
  message: z.string().trim().min(1, "Bericht verplicht").max(2000, "Bericht te lang"),
  turnstileToken: z.string().min(1, "Verificatie ontbreekt").max(4096),
  website: z.string().max(200).optional(), // honeypot
}).strict();

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const parsed = await parseJsonBody(req, ContactSchema);
  if (parsed instanceof Response) return parsed;
  const { name, email, message, turnstileToken, website } = parsed;

  // Honeypot: silently accept and discard.
  if (website && website.trim() !== "") {
    console.warn("Honeypot triggered for contact form");
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!TURNSTILE_SECRET_KEY) {
      console.error("TURNSTILE_SECRET_KEY ontbreekt");
      throw new Error("Configuratiefout");
    }

    // Verify Turnstile token
    const ip = req.headers.get("cf-connecting-ip")
      ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? "";
    const form = new FormData();
    form.append("secret", TURNSTILE_SECRET_KEY);
    form.append("response", turnstileToken);
    if (ip) form.append("remoteip", ip);

    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    const verifyJson = await verifyRes.json().catch(() => ({ success: false }));
    if (!verifyJson?.success) {
      console.warn("Turnstile verificatie mislukt", verifyJson);
      return new Response(
        JSON.stringify({ error: "Beveiligingscheck mislukt. Probeer het opnieuw." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email service niet geconfigureerd");
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color:#111;">Nieuw contactbericht via Last Ones Left</h2>
        <p><strong>Naam:</strong> ${escapeHtml(name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Bericht:</strong></p>
        <p style="white-space: pre-wrap; background:#f5f5f5; padding:12px; border-radius:6px;">${escapeHtml(message)}</p>
        <hr/>
        <p style="font-size:12px;color:#666;">Antwoord direct via 'Beantwoorden' — de reply gaat naar ${escapeHtml(email)}.</p>
      </div>`;

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Last Ones Left Contact <onboarding@resend.dev>",
        to: [RECIPIENT],
        reply_to: email,
        subject: `Contactformulier: ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error", res.status, errText);
      throw new Error("Verzenden mislukt");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-contact-message error", e);
    return new Response(
      JSON.stringify({ error: "Verzenden mislukt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
