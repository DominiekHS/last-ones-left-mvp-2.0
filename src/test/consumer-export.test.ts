import { describe, it, expect } from "vitest";
import { buildConsumerExportRows, CONSUMER_EXPORT_HEADERS } from "@/lib/consumer-export";

const p = (id: string, extra: any = {}) => ({
  user_id: id, full_name: id.toUpperCase(), email: `${id}@x.nl`,
  created_at: "2026-11-01T10:00:00Z", email_notifications_enabled: true, notification_mode: "all", ...extra,
});
const col = (h: string) => CONSUMER_EXPORT_HEADERS.indexOf(h);

describe("consumer export", () => {
  const rows = buildConsumerExportRows({
    consumers: [p("a"), p("b", { notification_mode: "personal", notification_categories: ["bowling"] }), p("d"), p("o", { email_notifications_enabled: false })],
    dummyIds: new Set(["d"]),
    referrals: [{ referrer_user_id: "a", referred_user_id: "b", verified_at: "2026-11-02T00:00:00Z" }],
    emailStatuses: [],
    claims: [],
  });
  const byEmail = (e: string) => rows.find((r) => r[1] === e)!;

  it("leaves out dummy accounts", () => {
    expect(rows.map((r) => r[1])).not.toContain("d@x.nl");
    expect(rows).toHaveLength(3);
  });
  it("marks referral vs organic with referrer", () => {
    expect(byEmail("b@x.nl")[col("Herkomst")]).toBe("Referral");
    expect(byEmail("b@x.nl")[col("Doorverwezen door (e-mail)")]).toBe("a@x.nl");
    expect(byEmail("a@x.nl")[col("Herkomst")]).toBe("Organisch");
    expect(byEmail("a@x.nl")[col("Zelf aangebracht (geteld)")]).toBe(1);
  });
  it("shows notification state", () => {
    expect(byEmail("a@x.nl")[col("Meldingen")]).toBe("Alle deals");
    expect(byEmail("b@x.nl")[col("Meldingen")]).toBe("Persoonlijk");
    expect(byEmail("o@x.nl")[col("Meldingen")]).toBe("Meldingen uit");
  });
  it("has no birth date column", () => {
    expect(CONSUMER_EXPORT_HEADERS.join(" ").toLowerCase()).not.toContain("geboorte");
  });
});
