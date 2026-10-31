import { describe, expect, it } from "vitest";
import { codePayload, hasRequiredPaymentSteps, isNoCodeCheckout, requiresCheckoutLink } from "@/lib/redemption";

describe("afrekenen zonder kortingscode", () => {
  it("requires a checkout link for the fourth method", () => {
    expect(requiresCheckoutLink("online_checkout_no_code")).toBe(true);
    expect(requiresCheckoutLink("at_counter")).toBe(false);
  });
  it("requires at least one completed payment step only for the fourth method", () => {
    expect(hasRequiredPaymentSteps("online_checkout_no_code", [])).toBe(false);
    expect(hasRequiredPaymentSteps("online_checkout_no_code", [{ text: "  " }])).toBe(false);
    expect(hasRequiredPaymentSteps("online_checkout_no_code", [{ text: "Kies je tijdslot." }])).toBe(true);
    expect(hasRequiredPaymentSteps("online_checkout", [])).toBe(true);
  });
  it("never saves hidden universal or unique codes for the fourth method", () => {
    expect(codePayload("online_checkout_no_code", "universal", "OLD-CODE")).toEqual({ discount_type: "none", discount_code: "" });
    expect(codePayload("online_checkout_no_code", "unique", "OLD-CODE")).toEqual({ discount_type: "none", discount_code: "" });
    expect(codePayload("online_checkout", "universal", " CODE ")).toEqual({ discount_type: "universal", discount_code: "CODE" });
  });
  it("does not treat the existing online refund method as code-free", () => {
    expect(isNoCodeCheckout("online_pay_pos_refund")).toBe(false);
    expect(isNoCodeCheckout("online_checkout_no_code")).toBe(true);
  });
});