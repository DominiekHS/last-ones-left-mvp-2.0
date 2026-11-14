import { describe, expect, it } from "vitest";
import { hasAvailablePreference, matchesNotification, type NotificationPreferences } from "@/lib/notification-preferences";
import { fetchAllRows } from "@/lib/fetch-all";

const available = [{ kind: "category", key: "minigolf", label: "Minigolf" }, { kind: "merchant", key: "bowling-groningen", label: "Bowling Groningen" }];
const personal: NotificationPreferences = { notification_mode: "personal", notification_categories: ["minigolf"], notification_merchants: ["bowling-groningen"], email_notifications_enabled: true };

describe("Persoonlijke meldingsregels", () => {
  it("meldingen uit geeft geen match en bewaart voorkeuren", () => {
    const off = { ...personal, email_notifications_enabled: false };
    expect(matchesNotification(off, "minigolf", "bowling-groningen", available)).toBe(false);
    expect(hasAvailablePreference(off, available)).toBe(true);
    expect(matchesNotification({ ...off, email_notifications_enabled: true }, "minigolf", "ander-bedrijf", available)).toBe(true);
  });
  it("alle deals vereist geen geselecteerde activiteit of bedrijf", () => {
    expect(matchesNotification({ ...personal, notification_mode: "all", notification_categories: [], notification_merchants: [] }, "lasergamen", "ander-bedrijf", [])).toBe(true);
  });
  it("alleen activiteit is voldoende", () => {
    expect(matchesNotification({ ...personal, notification_merchants: [] }, "minigolf", "ander-bedrijf", available)).toBe(true);
  });
  it("alleen bedrijf is voldoende ongeacht de activiteit", () => {
    expect(matchesNotification({ ...personal, notification_categories: [] }, "lasergamen", "bowling-groningen", available)).toBe(true);
  });
  it("beide overeenkomsten selecteren slechts één ontvanger", () => {
    expect([personal].filter(p => matchesNotification(p, "minigolf", "bowling-groningen", available))).toHaveLength(1);
  });
  it("geen overeenkomst geeft geen mail", () => {
    expect(matchesNotification(personal, "lasergamen", "ander-bedrijf", available)).toBe(false);
  });
  it("uitgeschakelde selecties tellen niet mee, herstel maakt ze weer actief", () => {
    expect(matchesNotification(personal, "minigolf", "bowling-groningen", [])).toBe(false);
    expect(matchesNotification(personal, "minigolf", "bowling-groningen", available)).toBe(true);
  });
  it("persoonlijke meldingen vereisen een beschikbare selectie", () => {
    expect(hasAvailablePreference({ notification_categories: [], notification_merchants: [] }, available)).toBe(false);
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