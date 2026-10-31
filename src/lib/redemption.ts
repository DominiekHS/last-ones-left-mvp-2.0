export type RedemptionMethod = "online_checkout" | "online_pay_pos_refund" | "at_counter" | "online_checkout_no_code";

export const NO_CODE_MESSAGE = "Kortingscode niet nodig - zie stappenplan";
export const NO_CODE_DESCRIPTION = "Klant hoeft geen kortingscode te gebruiken op jouw betaalpagina. De korting is op de betaalpagina al verwerkt.";

export function isNoCodeCheckout(method: string | null | undefined): boolean {
  return method === "online_checkout_no_code";
}

export function requiresCheckoutLink(method: string): boolean {
  return method === "online_checkout" || isNoCodeCheckout(method);
}

export function codePayload(method: string, type: "universal" | "unique", code: string) {
  return isNoCodeCheckout(method)
    ? { discount_type: "none", discount_code: "" }
    : { discount_type: type, discount_code: type === "universal" ? code.trim() : "" };
}

export function hasRequiredPaymentSteps(method: string, steps: { text: string }[]): boolean {
  return !isNoCodeCheckout(method) || (steps.length > 0 && steps.every(step => step.text.trim().length >= 5));
}