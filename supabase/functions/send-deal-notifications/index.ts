import { corsHeaders, requireUser } from "../_shared/auth.ts";
import { z, parseJsonBody } from "../_shared/validation.ts";
import { sendDealNotifications } from "../_shared/deal-mail.ts";

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

    const admin = auth.admin;

    // 2. Authorization: gebruiker moet admin zijn OF eigenaar van de deal-merchant
    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id, title, city, discount_percentage, expiry_time, notification_sent_at, merchant_id, publish_at")
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

    // 3a. Ingeplande advertentie: mail volgt automatisch op het publicatiemoment
    if (deal.publish_at && new Date(deal.publish_at as string) > new Date()) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "scheduled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3b. Testbedrijf: advertentie blijft gewoon zichtbaar, maar geen meldingen versturen
    const { data: testMerchant } = await admin
      .from("test_merchants")
      .select("merchant_id")
      .eq("merchant_id", deal.merchant_id)
      .maybeSingle();

    if (testMerchant) {
      await admin
        .from("deals")
        .update({ notification_sent_at: new Date().toISOString() })
        .eq("id", dealId);
      return new Response(
        JSON.stringify({ skipped: true, reason: "test_merchant", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lock immediately
    await admin
      .from("deals")
      .update({ notification_sent_at: new Date().toISOString() })
      .eq("id", dealId);

    const { sent, errors } = await sendDealNotifications(
      admin,
      deal as never,
      merchantRow?.company_name,
    );

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
