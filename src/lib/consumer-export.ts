import ExcelJS from "exceljs";
import { format } from "date-fns";
import { CATEGORY_LABELS } from "@/lib/constants";

export interface ExportProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  email_notifications_enabled: boolean;
  notification_mode?: string | null;
  notification_categories?: string[] | null;
  referral_code?: string | null;
}
export interface ExportReferral {
  referrer_user_id: string;
  referred_user_id: string;
  verified_at: string | null;
}
export interface ExportEmailStatus {
  user_id: string;
  email_confirmed_at: string | null;
}
export interface ExportClaim {
  user_id: string;
  claimed_at: string;
}

export const CONSUMER_EXPORT_HEADERS = [
  "Naam",
  "E-mail",
  "Account aangemaakt",
  "E-mail bevestigd",
  "Bevestigd op",
  "Herkomst",
  "Doorverwezen door (naam)",
  "Doorverwezen door (e-mail)",
  "Referral geteld",
  "Eigen referralcode",
  "Zelf aangebracht (geteld)",
  "Meldingen",
  "Gekozen activiteiten",
  "Aantal geclaimde kortingscodes",
  "Laatste claim",
];

const fmt = (d: string | null | undefined) => (d ? format(new Date(d), "dd-MM-yyyy HH:mm") : "");

export function notificationLabel(p: ExportProfile): string {
  if (!p.email_notifications_enabled || p.notification_mode === "off") return "Meldingen uit";
  if (p.notification_mode === "personal") return "Persoonlijk";
  return "Alle deals";
}

/** Builds one row per consumer; dummy accounts are left out. */
export function buildConsumerExportRows(input: {
  consumers: ExportProfile[];
  dummyIds: Set<string>;
  referrals: ExportReferral[];
  emailStatuses: ExportEmailStatus[];
  claims: ExportClaim[];
  nameById?: Map<string, { full_name: string | null; email: string }>;
}): (string | number)[][] {
  const { consumers, dummyIds, referrals, emailStatuses, claims } = input;
  const people = new Map<string, { full_name: string | null; email: string }>(input.nameById ?? []);
  consumers.forEach((c) => people.set(c.user_id, { full_name: c.full_name, email: c.email }));
  const referredBy = new Map(referrals.map((r) => [r.referred_user_id, r]));
  const verifiedCount = new Map<string, number>();
  referrals.forEach((r) => {
    if (r.verified_at && !dummyIds.has(r.referred_user_id))
      verifiedCount.set(r.referrer_user_id, (verifiedCount.get(r.referrer_user_id) ?? 0) + 1);
  });
  const confirmed = new Map(emailStatuses.map((s) => [s.user_id, s.email_confirmed_at]));
  const claimStats = new Map<string, { count: number; last: string }>();
  claims.forEach((c) => {
    const s = claimStats.get(c.user_id) ?? { count: 0, last: c.claimed_at };
    s.count++;
    if (c.claimed_at > s.last) s.last = c.claimed_at;
    claimStats.set(c.user_id, s);
  });

  return consumers
    .filter((c) => !dummyIds.has(c.user_id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((c) => {
      const ref = referredBy.get(c.user_id);
      const referrer = ref ? people.get(ref.referrer_user_id) : undefined;
      const conf = confirmed.get(c.user_id) ?? null;
      const mode = notificationLabel(c);
      const stats = claimStats.get(c.user_id);
      return [
        c.full_name ?? "",
        c.email,
        fmt(c.created_at),
        conf ? "Ja" : "Nee",
        fmt(conf),
        ref ? "Referral" : "Organisch",
        ref ? referrer?.full_name ?? "" : "",
        ref ? referrer?.email ?? "" : "",
        ref ? (ref.verified_at ? "Ja" : "Nee") : "",
        c.referral_code ?? "",
        verifiedCount.get(c.user_id) ?? 0,
        mode,
        mode === "Persoonlijk"
          ? (c.notification_categories ?? [])
              .map((k) => (CATEGORY_LABELS as Record<string, string>)[k] || k)
              .join(", ")
          : "",
        stats?.count ?? 0,
        fmt(stats?.last),
      ];
    });
}

export async function downloadConsumerExport(rows: (string | number)[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Consumenten");
  ws.addRow(CONSUMER_EXPORT_HEADERS);
  rows.forEach((r) => ws.addRow(r));
  ws.columns = CONSUMER_EXPORT_HEADERS.map((h) => ({ width: Math.max(16, h.length + 4) }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: CONSUMER_EXPORT_HEADERS.length } };
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consumenten_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
