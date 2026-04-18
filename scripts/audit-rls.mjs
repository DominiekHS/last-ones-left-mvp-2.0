#!/usr/bin/env node
/**
 * RLS + Policy audit — release gate
 *
 * Faalt (exit 1) als:
 *   1) Een public tabel RLS uit heeft staan
 *   2) Een tabel een actie (SELECT/INSERT/UPDATE/DELETE) mist die niet in
 *      INTENTIONAL_BLOCKS staat
 *
 * Draai voor build/deploy: `npm run audit:rls`.
 *
 * Vereist env var SUPABASE_DB_URL (Postgres connection string).
 * Lokaal: kopieer uit Lovable → Cloud → Database → Connection string (Direct connection).
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const ALLOWED_NO_RLS = new Set([
  // bewust leeg — alle public tabellen MOETEN RLS hebben
]);

/**
 * Tabellen waar bepaalde acties bewust geen policy hebben (volledig dicht
 * voor alle non-service-role users). Zie docs/policies.md voor de motivering.
 *
 * Format: { table: ["INSERT", "UPDATE", "DELETE"] }
 *   = "voor deze acties verwachten we GEEN policy"
 */
const INTENTIONAL_BLOCKS = {
  // user-owned, immutable / append-only
  profiles: ["DELETE"],
  vouchers: ["UPDATE", "DELETE"],
  claim_history: ["UPDATE", "DELETE"],
  user_roles: ["UPDATE", "DELETE"],

  // append-only / system-managed
  notification_log: ["INSERT", "UPDATE", "DELETE"],

  // soft-delete only
  merchants: ["DELETE"],
  app_settings: ["DELETE"],

  // analytics: insert mag, update niet
  deal_events: ["UPDATE"],

  // help content: alleen via admin ALL-policy (geen aparte INSERT/UPDATE/DELETE-policies)
  help_articles: ["INSERT", "UPDATE", "DELETE"],
  help_categories: ["INSERT", "UPDATE", "DELETE"],

  // admin-only via ALL-policy (admin_actions, merchant_communications) → alle acties gedekt door cmd='ALL'
  // → niet nodig om hier op te nemen, want check telt 'ALL' mee
};

const ALL_ACTIONS = ["SELECT", "INSERT", "UPDATE", "DELETE"];

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL env var is niet gezet.");
  console.error("   Haal hem op uit Lovable → Cloud → Database → Connection string.");
  console.error("   Lokaal: export SUPABASE_DB_URL='postgres://...'");
  process.exit(2);
}

let pg;
try {
  pg = require("pg");
} catch {
  console.error("❌ pg package ontbreekt. Run eerst: npm i -D pg");
  process.exit(2);
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  // 1) RLS-status
  const { rows: tables } = await client.query(`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  // 2) Policies per tabel/actie
  const { rows: policies } = await client.query(`
    SELECT tablename, cmd
    FROM pg_policies
    WHERE schemaname = 'public';
  `);

  const policyMap = new Map(); // table -> Set(actions)
  for (const p of policies) {
    if (!policyMap.has(p.tablename)) policyMap.set(p.tablename, new Set());
    if (p.cmd === "ALL") {
      // ALL dekt alle 4 acties
      ALL_ACTIONS.forEach((a) => policyMap.get(p.tablename).add(a));
    } else {
      policyMap.get(p.tablename).add(p.cmd);
    }
  }

  console.log(`\n📋 Public tabellen gevonden: ${tables.length}\n`);

  const rlsViolations = [];
  const policyGaps = [];

  for (const t of tables) {
    const rls = t.rls_enabled ? "✅" : "❌";
    const force = t.rls_forced ? "🔒" : "  ";
    const actions = policyMap.get(t.table_name) || new Set();
    const blocked = new Set(INTENTIONAL_BLOCKS[t.table_name] || []);

    const missing = ALL_ACTIONS.filter((a) => !actions.has(a) && !blocked.has(a));
    const present = ALL_ACTIONS.map((a) =>
      actions.has(a) ? a[0] : blocked.has(a) ? "·" : "✗"
    ).join("");

    console.log(`  ${rls} ${force}  ${t.table_name.padEnd(28)} [${present}]`);

    if (!t.rls_enabled && !ALLOWED_NO_RLS.has(t.table_name)) {
      rlsViolations.push(t.table_name);
    }
    if (missing.length > 0) {
      policyGaps.push({ table: t.table_name, missing });
    }
  }

  console.log(`\n  Legenda: [SIUD]  S/I/U/D=policy aanwezig  ·=bewust dicht  ✗=ontbreekt`);

  if (rlsViolations.length > 0) {
    console.error(`\n❌ ${rlsViolations.length} tabel(len) zonder RLS:`);
    for (const v of rlsViolations) console.error(`   - public.${v}`);
    console.error("\n   Fix: ALTER TABLE public.<naam> ENABLE ROW LEVEL SECURITY;");
  }

  if (policyGaps.length > 0) {
    console.error(`\n❌ ${policyGaps.length} tabel(len) met onverwachte policy-gaps:`);
    for (const g of policyGaps) {
      console.error(`   - public.${g.table} mist policy voor: ${g.missing.join(", ")}`);
    }
    console.error("\n   Fix: voeg expliciete policy toe, of declareer het als bewuste keuze");
    console.error("   in INTENTIONAL_BLOCKS (scripts/audit-rls.mjs) + docs/policies.md.\n");
  }

  if (rlsViolations.length > 0 || policyGaps.length > 0) {
    process.exit(1);
  }

  console.log("\n✅ Alle public tabellen hebben RLS én een complete (of bewust dichte) policy-set.\n");
  process.exit(0);
} catch (err) {
  console.error("❌ Audit faalde:", err.message);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
