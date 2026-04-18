#!/usr/bin/env node
/**
 * Scant de gebouwde frontend bundle (dist/) op patronen die op
 * uitgelekte secrets lijken. Faalt met exit code 1 als er treffers zijn.
 *
 * Gebruik:
 *   npm run build && node scripts/scan-bundle-secrets.mjs
 * of
 *   bash scripts/build-safe.sh
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST_DIR = "dist";
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".html", ".css", ".map", ".json", ".txt"]);

// Patronen die op échte geheimen wijzen.
// Bewust strict — vermijd false positives op de Supabase anon JWT.
const PATTERNS = [
  { name: "Stripe live secret key",        regex: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { name: "Stripe test secret key",        regex: /\bsk_test_[A-Za-z0-9]{16,}\b/g },
  { name: "Stripe restricted key",         regex: /\brk_(live|test)_[A-Za-z0-9]{16,}\b/g },
  { name: "OpenAI API key",                regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "Resend API key",                regex: /\bre_[A-Za-z0-9_]{20,}\b/g },
  { name: "Google API key",                regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "AWS Access Key ID",             regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: "GitHub token",                  regex: /\bghp_[A-Za-z0-9]{36}\b/g },
  { name: "Slack token",                   regex: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: "Private key block",             regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  // Supabase service_role JWT (role:"service_role" base64-encoded)
  // base64 van `"role":"service_role"` = `InJvbGUiOiJzZXJ2aWNlX3JvbGUi`
  { name: "Supabase service_role JWT",     regex: /InJvbGUiOiJzZXJ2aWNlX3JvbGUi/g },
  { name: "Literal service_role string",   regex: /\bSUPABASE_SERVICE_ROLE_KEY\b/g },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function preview(text, idx, span = 40) {
  const start = Math.max(0, idx - span);
  const end = Math.min(text.length, idx + span);
  return text.slice(start, end).replace(/\s+/g, " ");
}

let totalHits = 0;
const findings = [];

let files;
try {
  files = [...walk(DIST_DIR)];
} catch (e) {
  console.error(`✗ Kan ${DIST_DIR}/ niet lezen. Draai eerst 'npm run build'.`);
  process.exit(2);
}

for (const file of files) {
  if (!SCAN_EXTENSIONS.has(extname(file))) continue;
  const content = readFileSync(file, "utf8");
  for (const { name, regex } of PATTERNS) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(content)) !== null) {
      totalHits++;
      findings.push({
        file,
        pattern: name,
        snippet: preview(content, m.index),
      });
      if (findings.length > 50) break;
    }
  }
}

if (totalHits === 0) {
  console.log(`✓ Bundle scan OK — geen verdachte secret-patronen gevonden in ${files.length} bestanden.`);
  process.exit(0);
}

console.error(`✗ ${totalHits} verdachte treffer(s) in de frontend bundle:\n`);
for (const f of findings) {
  console.error(`  • [${f.pattern}] ${f.file}`);
  console.error(`      …${f.snippet}…`);
}
console.error(`\nBuild geblokkeerd. Verwijder het secret of verplaats de call naar een edge function.`);
process.exit(1);
