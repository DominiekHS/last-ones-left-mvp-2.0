export type NotificationChoice = "all" | "personal" | "off";
export interface NotificationPreferences {
  notification_mode: string;
  notification_categories: string[];
  notification_merchants: string[];
  email_notifications_enabled: boolean;
}
export interface AvailableNotificationChoice { kind: string; key: string; label: string }

export function hasAvailablePreference(preferences: Pick<NotificationPreferences, "notification_categories" | "notification_merchants">, choices: AvailableNotificationChoice[]) {
  return choices.some(c => c.kind === "category"
    ? preferences.notification_categories.includes(c.key)
    : c.kind === "merchant" && preferences.notification_merchants.includes(c.key));
}

export function matchesNotification(preferences: NotificationPreferences, category: string, merchantId: string, choices: AvailableNotificationChoice[]) {
  if (!preferences.email_notifications_enabled) return false;
  if (preferences.notification_mode === "all") return true;
  if (preferences.notification_mode !== "personal") return false;
  return choices.some(c => (c.kind === "category" && c.key === category && preferences.notification_categories.includes(c.key))
    || (c.kind === "merchant" && c.key === merchantId && preferences.notification_merchants.includes(c.key)));
}