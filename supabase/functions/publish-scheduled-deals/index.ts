/**
 * Verstuurt de meldingsmail voor ingeplande advertenties op het publicatiemoment.
 *
 * Wordt aangeroepen door:
 *  - een eenmalige pg_cron-taak die exact op `publish_at` afgaat (met dealId)
 *  - een vangnet dat elk uur draait (zonder dealId) zodat een gemiste mail alsnog volgt
 *
 * Alleen aanroepbaar met een geldig cron-secret.
 */
import { corsHeaders, requireCronSecret } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendDealNotifications } from "../_shared/deal-mail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronCheck = requireCronSecret(req);
  if (cronCheck) return cronCheck;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let dealId: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.dealId === "string") dealId = body.dealId;
    } catch {
      // leeg body = vangnetronde
    }

    const nowIso = new Date().toISOString();
    let query = admin
      .from("deals")
      .select("id, title, city, discount_percentage, expiry_time, merchant_id, publish_at, notification_sent_at, deleted_at, is_teaser")
      .is("deleted_at", null)
      .is("notification_sent_at", null)
      .not("publish_at", "is", null)
      .lte("publish_at", nowIso)
      .gt("expiry_time", nowIso)
      .eq("is_teaser", false);

    if (dealId) query = query.eq("id", dealId);

    const { data: deals, error } = await query;
    if (error) throw error;

    const results: Array<Record<string, unknown>> = [];

    for (const deal of deals ?? []) {
      // Merchant moet actief zijn; geschorst/geblokkeerd publiceert niets
      const { data: merchantRow } = await admin
        .from("merchants")
        .select("company_name, blocked, status, deleted_at")
        .eq("id", deal.merchant_id)
        .maybeSingle();

      if (
        !merchantRow ||
        merchantRow.blocked === true ||
        merchantRow.status !== "active" ||
        merchantRow.deleted_at !== null
      ) {
        results.push({ dealId: deal.id, skipped: "merchant_inactive" });
        continue;
      }

      // Idempotency: meteen vastleggen zodat er nooit twee mails uitgaan
      const { data: locked } = await admin
        .from("deals")
        .update({ notification_sent_at: new Date().toISOString() })
        .eq("id", deal.id)
        .is("notification_sent_at", null)
        .select("id");

      if (!locked || locked.length === 0) {
        results.push({ dealId: deal.id, skipped: "already_sent" });
        continue;
      }

      // Testbedrijf: advertentie blijft zichtbaar, maar geen meldingen
      const { data: testMerchant } = await admin
        .from("test_merchants")
        .select("merchant_id")
        .eq("merchant_id", deal.merchant_id)
        .maybeSingle();

      if (testMerchant) {
        results.push({ dealId: deal.id, skipped: "test_merchant" });
        continue;
      }

      const { sent, errors } = await sendDealNotifications(
        admin,
        deal as never,
        merchantRow.company_name,
      );
      results.push({ dealId: deal.id, sent, errors });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-scheduled-deals error", e);
    return new Response(JSON.stringify({ error: "Publicatie mislukt" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
