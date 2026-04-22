#!/usr/bin/env node
/**
 * Public-views audit — release gate
 *
 * Verifieert dat publieke (anon-bereikbare) hooks en componenten ALLEEN
 * `deals_public` en `merchants_public` selecteren — nooit direct de base
 * tables `deals` of `merchants`. Daarmee voorkomen we dat per ongeluk
 * gevoelige kolommen (`discount_code`, `contact_email`, `contact_phone`)
 * naar anonieme bezoekers lekken.
 *
 * Aanpak:
 *  1. Scan alle TS/TSX bestanden in src/.
 *  2. Markeer een bestand als "publiek" als het NIET in een ALLOWLIST staat
 *     (admin-routes, merchant-eigen routes, consumer-eigen routes).
 *  3. In publieke bestanden: elke `.from("deals")` of `.from("merchants")`
 *     is een fout. Gebruik `deals_public` / `merchants_public` in plaats.
 *
 * Faalt met exit 1 bij elke overtreding. Gebruik:
 *   npm run audit:public-views
 *   npm run audit:all     # draait queries + public-views + rls
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Base tables die NOOIT direct vanuit publieke code geraakt mogen worden. */
const FORBIDDEN_TABLES = ["deals", "merchants"];

/**
 * Bestanden/paden die WEL direct op de base tables mogen praten.
 * - admin/**     → admins gebruiken base tables (RLS dwingt has_role af)
 * - merchant/**  → merchants kijken naar eigen rijen (RLS filtert op user_id)
 * - consumer/**  → consumers kijken naar eigen vouchers/claims (RLS filtert)
 * - auth hooks   → bootstrap voor ingelogde sessie
 */
const ALLOWLIST = [
  { glob: /^src\/pages\/admin\//, reason: "Admin route — RLS dwingt has_role('admin') af" },
  { glob: /^src\/components\/admin\//, reason: "Admin component — RLS dwingt has_role('admin') af" },
  { glob: /^src\/pages\/merchant\//, reason: "Merchant route — RLS filtert op merchant.user_id" },
  { glob: /^src\/components\/merchant\//, reason: "Merchant component — RLS filtert op merchant.user_id" },
  { glob: /^src\/pages\/consumer\//, reason: "Consumer route — eigen claims, RLS-gefilterd" },
  { file: "src/hooks/useAuth.tsx", reason: "Auth bootstrap voor ingelogde gebruiker" },
  { file: "src/hooks/useMerchantProfile.ts", reason: "Haalt contact-velden bewust voor ingelogde users (RLS)" },
  { file: "src/hooks/useDeals.ts", reason: "useMerchantDeals targets eigen deals — RLS filtert op merchant_id" },
  { file: "src/integrations/supabase/types.ts", reason: "Generated types file" },
  { file: "src/lib/friendly-errors.ts", reason: "Voorbeeld in JSDoc-comment, geen runtime query" },
  { glob: /^src\/test\//, reason: "Test files — literals in regex/asserties" },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

function isAllowlisted(relPath) {
  for (const a of ALLOWLIST) {
    if (a.file && a.file === relPath) return a.reason;
    if (a.glob && a.glob.test(relPath)) return a.reason;
  }
  return null;
}

const FORBIDDEN_RE = new RegExp(
  `\\.from\\(\\s*["'](${FORBIDDEN_TABLES.join("|")})["']\\s*\\)`,
  "g"
);

const files = walk(SRC);
const findings = [];

for (const f of files) {
  const rel = relative(ROOT, f);
  if (isAllowlisted(rel)) continue; // skip authoritative routes

  const src = readFileSync(f, "utf8");
  let m;
  FORBIDDEN_RE.lastIndex = 0;
  while ((m = FORBIDDEN_RE.exec(src))) {
    const line = src.slice(0, m.index).split("\n").length;
    findings.push({
      file: rel,
      line,
      table: m[1],
      suggestion: `${m[1]}_public`,
    });
  }
}

console.log(`\n🔍 Public-views audit — ${files.length} TS/TSX files gescand\n`);

if (findings.length > 0) {
  console.error(
    `❌ ${findings.length} overtreding${findings.length === 1 ? "" : "en"}: publieke code gebruikt base table direct.\n`
  );
  for (const f of findings) {
    console.error(`   ${f.file}:${f.line}`);
    console.error(`     gebruikt:    .from("${f.table}")`);
    console.error(`     vervang door: .from("${f.suggestion}")`);
    console.error();
  }
  console.error("Fix opties:");
  console.error(`  1. Vervang .from("deals") → .from("deals_public" as any)`);
  console.error(`  2. Vervang .from("merchants") → .from("merchants_public" as any)`);
  console.error("  3. Of: verplaats naar src/pages/{admin,merchant,consumer}/ als het rolspecifiek is.");
  console.error("  4. Of: voeg toe aan ALLOWLIST in scripts/audit-public-views.mjs met motivering.\n");
  process.exit(1);
}

console.log("✅ Alle publieke hooks/componenten gebruiken uitsluitend deals_public / merchants_public.\n");
process.exit(0);
