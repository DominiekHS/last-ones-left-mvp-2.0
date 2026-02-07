export type MerchantStatus = "active" | "suspended" | "blocked";

export const STATUS_LABELS: Record<MerchantStatus, string> = {
  active: "Actief",
  suspended: "Geschorst",
  blocked: "Geblokkeerd",
};

export const STATUS_VARIANTS: Record<MerchantStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  suspended: "secondary",
  blocked: "destructive",
};

export const SUSPENSION_REASONS = [
  { value: "fraud", label: "Fraude / misbruik" },
  { value: "misleading", label: "Misleidende advertentie" },
  { value: "inappropriate", label: "Ongepaste content" },
  { value: "complaints", label: "Klachten van consumenten" },
  { value: "terms", label: "Schending voorwaarden" },
  { value: "other", label: "Anders" },
] as const;

export const CHANNEL_OPTIONS = [
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefoon" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Anders" },
] as const;

export const OUTCOME_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "completed", label: "Afgerond" },
  { value: "waiting", label: "Wacht op merchant" },
  { value: "escalation", label: "Escalatie" },
] as const;

export function getMerchantEffectiveStatus(merchant: {
  status: string;
  suspended_until?: string | null;
  blocked?: boolean;
}): MerchantStatus {
  if (merchant.status === "blocked" || merchant.blocked) return "blocked";
  if (merchant.status === "suspended") {
    if (merchant.suspended_until && new Date(merchant.suspended_until) > new Date()) {
      return "suspended";
    }
    return "active"; // suspension expired
  }
  return "active";
}
