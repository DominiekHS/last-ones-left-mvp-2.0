#!/usr/bin/env node
/**
 * Scant de SOURCE-tree (src/, supabase/functions/, scripts/, public/, docs/)
 * op patronen die op uitgelekte secrets lijken — én op committable .env files.
 *
 * Verschil met scan-bundle-secrets.mjs:
 *   - die scant `dist/` (gebouwde output)
 *   - deze scant ingecheckte sources, vóór build/commit
 *
 * Gebruik:
 *   node scripts/scan-source-secrets.mjs
 *
 * Faalt met exit 1 als er treffers zijn, anders exit 0.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, basename } from "node:path";

const SCAN_DIRS = ["src", "supabase/functions", "scripts", "public", "docs"];
const SCAN_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".html", ".css", ".json", ".md", ".txt", ".yml", ".yaml", ".sh",
]);

// Bestanden die per ongeluk in de repo terecht kunnen komen.
const FORBIDDEN_FILE_PATTERNS = [
  /^\.env(\..+)?$/,       // .env, .env.local, .env.production, ...
  /^.+\.env$/,            // staging.env, prod.env, ...
  /^\.envrc$/,            // direnv
];

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
  // Supabase service_role JWT (heeft `"role":"service_role"` base64-encoded payload)
  { name: "Supabase service_role JWT",     regex: /InJvbGUiOiJzZXJ2aWNlX3JvbGUi/g },
];

// Bestanden die we *altijd* uitsluiten (false positives).
const ALLOWLIST = new Set([
  "scripts/scan-source-secrets.mjs",   // bevat zelf de patterns
  "scripts/scan-bundle-secrets.mjs",   // idem
  "scripts/README.md",                 // legt patterns uit
  "docs/env.md",                       // documenteert var-namen
]);

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

const findings = [];

// 1. Forbidden files in repo root
for (const entry of readdirSync(".")) {
  for (const pat of FORBIDDEN_FILE_PATTERNS) {
    if (pat.test(entry) && entry !== ".env.example") {
      findings.push({
        file: entry,
        pattern: "Committable env file",
        snippet: "(env-bestand mag niet in repository)",
      });
    }
  }
}

// 2. Pattern scan in source dirs
for (const dir of SCAN_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (ALLOWLIST.has(file.replace(/\\/g, "/"))) continue;
    if (!SCAN_EXTENSIONS.has(extname(file))) continue;

    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    for (const { name, regex } of PATTERNS) {
      regex.lastIndex = 0;
      let m;
      while ((m = regex.exec(content)) !== null) {
        findings.push({
          file,
          pattern: name,
          snippet: preview(content, m.index),
        });
        if (findings.length > 50) break;
      }
    }
  }
}

if (findings.length === 0) {
  console.log("✓ Source scan OK — geen secret-patronen of env-bestanden gevonden.");
  process.exit(0);
}

console.error(`✗ ${findings.length} verdachte treffer(s) in source tree:\n`);
for (const f of findings) {
  console.error(`  • [${f.pattern}] ${f.file}`);
  console.error(`      …${f.snippet}…`);
}
console.error(
  "\nVerplaats secrets naar Lovable Cloud → Edge functions → Secrets " +
  "(server-side, gelezen via Deno.env.get) en commit nooit .env files."
);
process.exit(1);
