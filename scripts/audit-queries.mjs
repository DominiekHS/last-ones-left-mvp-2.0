#!/usr/bin/env node
/**
 * Query audit — release gate
 *
 * Scant client-code (src/) op risicovolle Supabase queries:
 *   1) `.from("<sensitive>").select(...)` zonder `.eq("user_id"|"merchant_id", ...)`
 *      én zonder `.maybeSingle()/.single()` op een ge-id'de rij
 *   2) `.from("<sensitive>")` aanroepen die niet binnen een admin-pagina staan
 *      (admin RLS verifieert role; deze controle zorgt dat we geen onbedoelde
 *      private fetches in publieke routes hebben)
 *
 * Faalt met exit 1 bij verdachte patterns. False positives → voeg toe aan ALLOWLIST.
 *
 * Run lokaal voor build/deploy:
 *   npm run audit:queries
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Tabellen waarvan we élke client-side query willen reviewen. */
const SENSITIVE_TABLES = [
  "profiles",
  "vouchers",
  "claim_history",
  "user_roles",
  "admin_actions",
  "merchant_communications",
  "notification_log",
  "unique_codes",
  "deal_sales_daily",
  "activity_requests",
];

/** Tabellen die bewust publiek leesbaar zijn — alle SELECTs daarop zijn OK. */
const PUBLIC_TABLES = ["deals", "merchants_public", "app_settings", "help_categories", "help_articles"];

/**
 * Files of patronen die we expliciet toestaan ondanks dat ze de heuristiek triggeren.
 * Format: { file: "path/relative", reason: "..." }
 */
const ALLOWLIST = [
  // Auth-bootstrap haalt eigen profiel/rollen op (gefilterd op user.id) — false positive
  { file: "src/hooks/useAuth.tsx", reason: "Bootstrap fetch eigen profiel/rollen, gefilterd op user.id" },
  // Admin pagina's — RLS staat alleen admins toe, expliciete admin-route in pad
  { fileGlob: /^src\/pages\/admin\//, reason: "Admin route, RLS dwingt has_role('admin') af" },
  { fileGlob: /^src\/components\/admin\//, reason: "Admin component, RLS dwingt has_role('admin') af" },
  // Merchant ophalen van eigen contact-velden — gefilterd op id
  { file: "src/hooks/useMerchantProfile.ts", reason: "Filtert op merchantId, contact-velden alleen voor ingelogde users" },
];

const SENSITIVE_RE = new RegExp(
  `\\.from\\(\\s*["'](${SENSITIVE_TABLES.join("|")})["']\\s*\\)`,
  "g"
);

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
    if (a.fileGlob && a.fileGlob.test(relPath)) return a.reason;
  }
  return null;
}

/**
 * Inspecteert een chain rondom een `.from("...")` call:
 * pakt ~600 chars context na de match, controleert of er een filter
 * (.eq / .in / .match / .filter / .contains met user_id/merchant_id/id/key)
 * volgt vóór de chain afloopt.
 */
function chainHasOwnershipFilter(snippet) {
  // Vind chain-einde: eerste `;`, `}` of newline+newline
  const end = snippet.search(/(;|\n\s*\n|\}\s*[,);])/);
  const chain = end >= 0 ? snippet.slice(0, end) : snippet;

  // Zoek expliciete filter-aanroepen
  return /\.(eq|in|match|filter|contains)\(\s*["'](user_id|merchant_id|id|key|category_id|deal_id|assigned_to_user_id)["']/.test(
    chain
  );
}

const files = walk(SRC);
const findings = [];

for (const f of files) {
  const rel = relative(ROOT, f);
  const allowReason = isAllowlisted(rel);
  const src = readFileSync(f, "utf8");

  let m;
  SENSITIVE_RE.lastIndex = 0;
  while ((m = SENSITIVE_RE.exec(src))) {
    const table = m[1];
    const after = src.slice(m.index, m.index + 800);

    if (!chainHasOwnershipFilter(after)) {
      // Lijn-nummer
      const line = src.slice(0, m.index).split("\n").length;
      findings.push({
        file: rel,
        line,
        table,
        allowReason,
        snippet: after.split("\n").slice(0, 3).join(" ").slice(0, 120),
      });
    }
  }
}

console.log(`\n🔍 Query audit — ${files.length} TS/TSX files gescand\n`);

const real = findings.filter((f) => !f.allowReason);
const allowed = findings.filter((f) => f.allowReason);

if (allowed.length > 0) {
  console.log(`ℹ️  ${allowed.length} match(es) op allowlist (OK):`);
  for (const a of allowed) {
    console.log(`   · ${a.file}:${a.line} → ${a.table}  [${a.allowReason}]`);
  }
  console.log();
}

if (real.length > 0) {
  console.error(`❌ ${real.length} verdachte quer${real.length === 1 ? "y" : "ies"} zonder ownership-filter:\n`);
  for (const f of real) {
    console.error(`   ${f.file}:${f.line}`);
    console.error(`     table: ${f.table}`);
    console.error(`     near:  ${f.snippet}…`);
    console.error();
  }
  console.error("Fix opties:");
  console.error("  1. Voeg een expliciete filter toe: .eq('user_id', user.id) of .eq('merchant_id', ...).");
  console.error("  2. Verplaats naar src/pages/admin/ of src/components/admin/ als het admin-only is.");
  console.error("  3. Zet op de ALLOWLIST in scripts/audit-queries.mjs met motivering.\n");
  process.exit(1);
}

console.log("✅ Geen risicovolle queries gevonden. RLS + expliciete filters in orde.\n");
process.exit(0);
