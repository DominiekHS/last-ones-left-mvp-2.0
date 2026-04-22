import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Whitelist van bestanden die expliciet "publiek" zijn:
 * worden ook door anonieme bezoekers geladen, mogen dus NOOIT direct
 * `deals` of `merchants` (base tables) selecteren — alleen `deals_public`
 * en `merchants_public` (views zonder gevoelige kolommen).
 *
 * Aanvullend op het globale script `scripts/audit-public-views.mjs`:
 * dit lockt expliciet de hooks die we kennen als publiek vast in CI.
 */
/**
 * `useDeals.ts` bevat zowel publieke (useActiveDeals/useDeal) als merchant-eigen
 * (useMerchantDeals) queries — die laatste mag bewust direct op `deals` praten.
 * Daarom checken we hier alleen de pure publieke hooks; de gemengde file wordt
 * gedekt door scripts/audit-public-views.mjs (allowlist met motivering).
 */
const PUBLIC_HOOK_FILES = [
  "src/hooks/useCities.ts",
];

const ROOT = process.cwd();

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Public hooks query only public views", () => {
  for (const file of PUBLIC_HOOK_FILES) {
    it(`${file} mag geen .from("deals") direct gebruiken`, () => {
      const src = readSrc(file);
      // Match ".from('deals')" of '.from("deals")' (geen _public suffix)
      const matches = src.match(/\.from\(\s*["']deals["']\s*\)/g);
      expect(matches, `${file} gebruikt .from("deals") direct — gebruik deals_public`).toBeNull();
    });

    it(`${file} mag geen .from("merchants") direct gebruiken`, () => {
      const src = readSrc(file);
      const matches = src.match(/\.from\(\s*["']merchants["']\s*\)/g);
      expect(matches, `${file} gebruikt .from("merchants") direct — gebruik merchants_public`).toBeNull();
    });

    it(`${file} moet ten minste één publieke view raken`, () => {
      const src = readSrc(file);
      const usesPublicView =
        /\.from\(\s*["']deals_public["']/.test(src) ||
        /\.from\(\s*["']merchants_public["']/.test(src);
      expect(
        usesPublicView,
        `${file} raakt geen deals_public/merchants_public — controleer of het wel een publieke hook is`
      ).toBe(true);
    });
  }
});
