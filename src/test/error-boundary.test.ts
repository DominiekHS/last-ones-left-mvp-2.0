import { describe, expect, it } from "vitest";
import { isStaleBundleError } from "@/components/ErrorBoundary";

describe("Foutherkenning voor verouderde bundel", () => {
  it("herkent de gemelde useRef-crash als verouderde bundel", () => {
    expect(
      isStaleBundleError(new TypeError("Cannot read properties of null (reading 'useRef')")),
    ).toBe(true);
    expect(
      isStaleBundleError(new TypeError("Cannot read properties of null (reading 'useState')")),
    ).toBe(true);
  });

  it("herkent een module die niet geladen kan worden als verouderde bundel", () => {
    expect(
      isStaleBundleError(
        new Error("Failed to fetch dynamically imported module: http://localhost:8080/src/main.tsx"),
      ),
    ).toBe(true);
  });

  it("laat gewone fouten over aan de normale fallback", () => {
    expect(isStaleBundleError(new Error("invalid input syntax for type uuid"))).toBe(false);
    expect(isStaleBundleError(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isStaleBundleError(undefined)).toBe(false);
  });
});
