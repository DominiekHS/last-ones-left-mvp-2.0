import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, requireUser } from "../_shared/auth.ts";
import { z, parseJsonBody } from "../_shared/validation.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const NotifySchema = z.object({
  dealId: z.string().uuid("dealId moet een geldige UUID zijn"),
}).strict();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Auth: alleen ingelogde users mogen dit triggeren
  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;

  // 2. Input-validatie
  const parsed = await parseJsonBody(req, NotifySchema);
  if (parsed instanceof Response) return parsed;
  const { dealId } = parsed;

  try {

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const admin = auth.admin;

    // 2. Authorization: gebruiker moet admin zijn OF eigenaar van de deal-merchant
    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id, title, city, discount_percentage, expiry_time, notification_sent_at, merchant_id")
      .eq("id", dealId)
      .maybeSingle();

    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: adminRole }, { data: merchantRow }] = await Promise.all([
      admin
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.userId)
        .eq("role", "admin")
        .maybeSingle(),
      admin
        .from("merchants")
        .select("user_id, company_name, blocked, status, deleted_at")
        .eq("id", deal.merchant_id)
        .maybeSingle(),
    ]);

    const isAdmin = !!adminRole;
    const isOwner = merchantRow?.user_id === auth.userId;
    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: "Geen toegang tot deze deal" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block suspended/blocked/deleted merchants from sending notifications (admins exempt)
    if (
      !isAdmin &&
      isOwner &&
      (merchantRow?.blocked === true ||
        merchantRow?.status !== "active" ||
        merchantRow?.deleted_at !== null)
    ) {
      return new Response(
        JSON.stringify({ error: "Account geblokkeerd of niet actief" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Idempotency
    if (deal.notification_sent_at) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "already_sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lock immediately
    await admin
      .from("deals")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", dealId);

    // Recipients: opted-in consumers
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("email_notifications_enabled", true);

    const recipients = (profiles ?? []).filter((p) => p.email);
    const origin = Deno.env.get("SITE_URL");
    if (!origin || !/^https?:\/\//.test(origin)) {
      console.error("SITE_URL ontbreekt of ongeldig");
      return new Response(JSON.stringify({ error: "Configuratiefout" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dealLinkBase = `${origin.replace(/\/+$/, "")}/deal/${deal.id}`;
    const expiry = new Date(deal.expiry_time).toLocaleString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      dateStyle: "short",
      timeStyle: "short",
    });

    let sent = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // HTML-escape om injection via merchant/user/deal velden te voorkomen.
    // Voorkomt dat een merchant met company_name "<script>..." of een user met
    // full_name "<img onerror=...>" de e-mail kan kapen voor phishing.
    const escapeHtml = (input: unknown): string =>
      String(input ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const safeMerchantName = escapeHtml(merchantRow?.company_name ?? "een aanbieder");
    const safeDealTitle = escapeHtml(deal.title);
    const safeDealCity = escapeHtml(deal.city);
    const safeExpiry = escapeHtml(expiry);
    const safeDiscountPct = escapeHtml(deal.discount_percentage);

    for (const r of recipients) {
      const dealLink = `${dealLinkBase}?as=${encodeURIComponent(r.user_id)}`;
      const safeFullName = escapeHtml(r.full_name || "daar");
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color:#111;">Nieuwe deal op Last Ones Left</h2>
          <p>Hoi ${safeFullName},</p>
          <p>Er is een nieuwe last-minute deal geplaatst door <strong>${safeMerchantName}</strong>.</p>
          <ul>
            <li><strong>Deal:</strong> ${safeDealTitle}</li>
            <li><strong>Plaats:</strong> ${safeDealCity}</li>
            <li><strong>Korting:</strong> ${safeDiscountPct}%</li>
            <li><strong>Verloopt:</strong> ${safeExpiry}</li>
          </ul>
          <p style="margin: 24px 0;">
            <a href="${dealLink}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Bekijk deal</a>
          </p>
          <hr/>
          <p style="font-size:12px;color:#666;">
            Je ontvangt deze mail omdat 'E-mail meldingen' aan staat.
            <a href="${origin}/profiel">Meldingen uitzetten</a>.
          </p>
        </div>`;

      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "Last Ones Left <onboarding@resend.dev>",
            to: [r.email],
            subject: `Nieuwe deal op Last Ones Left: ${deal.title}`,
            html,
          }),
        });
        if (!res.ok) {
          errors++;
          const body = await res.text();
          errorDetails.push(`${r.email}: ${res.status} ${body.slice(0, 120)}`);
        } else {
          sent++;
          await res.text();
        }
      } catch (e) {
        errors++;
        errorDetails.push(`${r.email}: ${(e as Error).message}`);
      }
    }

    await admin.from("notification_log").insert({
      deal_id: dealId,
      sent_count: sent,
      errors_count: errors,
      error_details: errorDetails.slice(0, 20).join("\n") || null,
    });

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-deal-notifications error", e);
    // Geen interne details lekken naar de client.
    return new Response(
      JSON.stringify({ error: "Notificatie mislukt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
