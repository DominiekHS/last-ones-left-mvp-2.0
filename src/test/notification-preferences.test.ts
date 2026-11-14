import { describe, expect, it } from "vitest";
import { hasAvailablePreference, matchesNotification, type NotificationPreferences } from "@/lib/notification-preferences";
import { fetchAllRows } from "@/lib/fetch-all";

const available = [{ kind: "category", key: "minigolf", label: "Minigolf" }, { kind: "category", key: "bowling", label: "Bowling" }];
const personal: NotificationPreferences = { notification_mode: "personal", notification_categories: ["minigolf"], email_notifications_enabled: true };

describe("Persoonlijke meldingsregels", () => {
  it("meldingen uit geeft geen match en bewaart voorkeuren", () => {
    const off = { ...personal, email_notifications_enabled: false };
    expect(matchesNotification(off, "minigolf", available)).toBe(false);
    expect(hasAvailablePreference(off, available)).toBe(true);
    expect(matchesNotification({ ...off, email_notifications_enabled: true }, "minigolf", available)).toBe(true);
  });
  it("alle deals vereist geen geselecteerde activiteit", () => {
    expect(matchesNotification({ ...personal, notification_mode: "all", notification_categories: [] }, "lasergamen", [])).toBe(true);
  });
  it("een geselecteerde activiteit matcht", () => {
    expect(matchesNotification(personal, "minigolf", available)).toBe(true);
  });
  it("geen overeenkomst geeft geen mail", () => {
    expect(matchesNotification(personal, "lasergamen", available)).toBe(false);
  });
  it("uitgeschakelde selecties tellen niet mee, herstel maakt ze weer actief", () => {
    expect(matchesNotification(personal, "minigolf", [])).toBe(false);
    expect(matchesNotification(personal, "minigolf", available)).toBe(true);
  });
  it("persoonlijke meldingen vereisen een beschikbare selectie", () => {
    expect(hasAvailablePreference({ notification_categories: [] }, available)).toBe(false);
    expect(hasAvailablePreference(personal, [])).toBe(false);
    expect(hasAvailablePreference(personal, available)).toBe(true);
  });
  it("haalt ontvangers boven 1000 volledig op", async () => {
    const rows = Array.from({ length: 2005 }, (_, id) => ({ id }));
    const result = await fetchAllRows(async (from,to) => ({ data: rows.slice(from,to+1), error: null }));
    expect(result).toHaveLength(2005);
    expect(result[2004].id).toBe(2004);
  });
});
