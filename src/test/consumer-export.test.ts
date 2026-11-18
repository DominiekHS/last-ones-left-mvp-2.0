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

describe("consumer export confirmation method", () => {
  const rows = buildConsumerExportRows({
    consumers: [p("self"), p("manual"), p("open"), p("pending")],
    dummyIds: new Set(),
    referrals: [],
    emailStatuses: [
      { user_id: "self", confirmation_sent_at: "2026-11-01T10:00:00Z", email_confirmed_at: "2026-11-01T10:05:00Z", confirmation_method: null },
      { user_id: "manual", confirmation_sent_at: "2026-11-01T10:00:00Z", email_confirmed_at: "2026-11-01T11:00:00Z", confirmation_method: "manual" },
      { user_id: "open", confirmation_sent_at: null, email_confirmed_at: "2026-11-01T10:00:00Z", confirmation_method: null },
      { user_id: "pending", confirmation_sent_at: "2026-11-01T10:00:00Z", email_confirmed_at: null, confirmation_method: null },
    ],
    claims: [],
  });
  const byEmail = (email: string) => rows.find((row) => row[1] === email)!;
  const method = (email: string) => byEmail(email)[col("Wijze van bevestiging")];

  it("marks consumers who confirmed through their own email link", () => {
    expect(method("self@x.nl")).toBe("Zelf via bevestigingslink");
  });

  it("marks manually confirmed consumers", () => {
    expect(method("manual@x.nl")).toBe("Handmatig bevestigd");
  });

  it("marks consumers who signed up while verification was disabled", () => {
    expect(method("open@x.nl")).toBe("Geen verificatie nodig");
  });

  it("keeps unconfirmed consumers recognizable", () => {
    expect(method("pending@x.nl")).toBe("Niet bevestigd");
  });
});
