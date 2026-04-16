import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId } = await req.json();
    if (!dealId || typeof dealId !== "string") {
      return new Response(JSON.stringify({ error: "dealId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load deal + check idempotency
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

    if (deal.notification_sent_at) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "already_sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lock immediately to prevent duplicates from concurrent calls
    await admin
      .from("deals")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", dealId);

    // Merchant name
    const { data: merchant } = await admin
      .from("merchants")
      .select("company_name")
      .eq("id", deal.merchant_id)
      .maybeSingle();

    // Recipients: opted-in consumers
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, email, full_name")
      .eq("email_notifications_enabled", true);

    const recipients = (profiles ?? []).filter((p) => p.email);
    const origin = "https://id-preview--b749b3f9-6f4b-447c-9d89-5acfe43fb2c7.lovable.app";
    const dealLinkBase = `${origin}/deal/${deal.id}`;
    const expiry = new Date(deal.expiry_time).toLocaleString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      dateStyle: "short",
      timeStyle: "short",
    });

    let sent = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Send sequentially in small batches to respect rate limits
    for (const r of recipients) {
      const dealLink = `${dealLinkBase}?as=${r.user_id}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color:#111;">Nieuwe deal op Last Ones Left</h2>
          <p>Hoi ${r.full_name || "daar"},</p>
          <p>Er is een nieuwe last-minute deal geplaatst door <strong>${merchant?.company_name ?? "een aanbieder"}</strong>.</p>
          <ul>
            <li><strong>Deal:</strong> ${deal.title}</li>
            <li><strong>Plaats:</strong> ${deal.city}</li>
            <li><strong>Korting:</strong> ${deal.discount_percentage}%</li>
            <li><strong>Verloopt:</strong> ${expiry}</li>
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
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
