/**
 * Gedeelde logica voor het versturen van deal-meldingsmails.
 * Gebruikt door:
 *  - send-deal-notifications (direct gepubliceerde advertenties)
 *  - publish-scheduled-deals (ingeplande advertenties, op publicatiemoment)
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";
const FROM_EMAIL = "noreply@lastonesleft.nl";
const FROM_NAME = "Last Ones Left";

export interface DealForMail {
  id: string;
  title: string;
  city: string;
  category: string;
  merchant_id: string;
  discount_percentage: number;
  expiry_time: string;
}

const escapeHtml = (input: unknown): string =>
  String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Verstuurt de meldingsmail naar alle opt-in consumenten (dummy-accounts uitgesloten)
 * en logt het resultaat in notification_log.
 */
export async function sendDealNotifications(
  admin: SupabaseClient,
  deal: DealForMail,
  merchantName: string | null | undefined,
): Promise<{ sent: number; errors: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
  if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");

  const recipients: Array<{ user_id: string; email: string; full_name: string; notification_mode: string }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.rpc("notification_recipients", { p_category: deal.category, p_merchant_id: deal.merchant_id })
      .order("user_id").range(from, from + 999);
    if (error) throw error;
    recipients.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const selectedAll = recipients.filter(r => r.notification_mode === "all").length;
  const selectedPersonal = recipients.length - selectedAll;

  const origin = "https://lastonesleft.nl";
  const dealLink = `${origin}/deal/${deal.id}`;
  const expiry = new Date(deal.expiry_time).toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    dateStyle: "short",
    timeStyle: "short",
  });

  const safeMerchantName = escapeHtml(merchantName ?? "een aanbieder");
  const safeDealTitle = escapeHtml(deal.title);
  const safeDealCity = escapeHtml(deal.city);
  const safeExpiry = escapeHtml(expiry);
  const safeDiscountPct = escapeHtml(deal.discount_percentage);

  let sent = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  for (const r of recipients) {
    const safeFullName = escapeHtml((r as { full_name?: string }).full_name || "daar");
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
          Je ontvangt deze mail volgens je meldingsvoorkeuren.
          <a href="${origin}/profiel?tab=meldingen">Meldingsvoorkeuren aanpassen</a>.
        </p>
      </div>`;

    try {
      const res = await fetch(`${GATEWAY_URL}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: [{ email: (r as { email: string }).email }],
          subject: `Nieuwe deal op Last Ones Left: ${deal.title}`,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        errors++;
        const body = await res.text();
        errorDetails.push(`${(r as { email: string }).email}: ${res.status} ${body.slice(0, 120)}`);
      } else {
        sent++;
        await res.text();
      }
    } catch (e) {
      errors++;
      errorDetails.push(`${(r as { email: string }).email}: ${(e as Error).message}`);
    }
  }

  await admin.from("notification_log").insert({
    deal_id: deal.id,
    selected_all_count: selectedAll,
    selected_personal_count: selectedPersonal,
    sent_count: sent,
    errors_count: errors,
    error_details: errorDetails.slice(0, 20).join("\n") || null,
  });

  return { sent, errors };
}
