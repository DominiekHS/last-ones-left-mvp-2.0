#!/usr/bin/env node
/**
 * RLS audit — release gate
 *
 * Faalt (exit 1) als er public tabellen zijn zonder Row Level Security.
 * Draai voor build/deploy: `npm run audit:rls`.
 *
 * Vereist env var SUPABASE_DB_URL (Postgres connection string).
 * Lokaal: kopieer uit Lovable → Cloud → Database → Connection string (Direct connection).
 *
 * Skip-lijst: tabellen die bewust geen RLS hebben (geen op dit moment).
 * Voeg toe aan ALLOWED_NO_RLS als dat ooit verandert.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const ALLOWED_NO_RLS = new Set([
  // bewust leeg — alle public tabellen MOETEN RLS hebben
]);

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

  const { rows } = await client.query(`
    SELECT c.relname AS table_name,
           c.relrowsecurity AS rls_enabled,
           c.relforcerowsecurity AS rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  const violations = rows.filter(
    (r) => !r.rls_enabled && !ALLOWED_NO_RLS.has(r.table_name)
  );

  console.log(`\n📋 Public tabellen gevonden: ${rows.length}\n`);
  for (const r of rows) {
    const rls = r.rls_enabled ? "✅" : "❌";
    const force = r.rls_forced ? "🔒 FORCE" : "  ";
    console.log(`  ${rls} ${force}  ${r.table_name}`);
  }

  if (violations.length > 0) {
    console.error(`\n❌ ${violations.length} tabel(len) zonder RLS:`);
    for (const v of violations) console.error(`   - public.${v.table_name}`);
    console.error("\n   Fix: ALTER TABLE public.<naam> ENABLE ROW LEVEL SECURITY;");
    console.error("   En voeg policies toe via een Lovable Cloud migratie.\n");
    process.exit(1);
  }

  console.log("\n✅ Alle public tabellen hebben RLS aanstaan.\n");
  process.exit(0);
} catch (err) {
  console.error("❌ Audit faalde:", err.message);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
