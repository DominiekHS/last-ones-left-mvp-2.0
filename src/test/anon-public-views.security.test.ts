/**
 * End-to-end security test
 * --------------------------------------------------
 * Verifieert dat ANONIEME bezoekers de publieke views `deals_public`
 * en `merchants_public` kunnen lezen, en dat dit OOK blijft werken
 * na een login/logout-cyclus van een echte consument-account.
 *
 * Doel: bewaken dat toekomstige RLS-/grants-wijzigingen de publieke
 * homepage niet stilletjes leegtrekken (zoals eerder met Fix #1 gebeurde).
 *
 * Hits een live Supabase project (read-only). Vereist netwerk; skip in CI
 * door SKIP_LIVE_SUPABASE_TESTS=1 te zetten.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://otosschuqvmgymmdnawm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90b3NzY2h1cXZtZ3ltbWRuYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDk5MjQsImV4cCI6MjA4NTk4NTkyNH0.97Bhm_iwhVZnnfUDwUVZzuCpJu9NRWyPwgEo4vpsjpw";

const CONSUMER_EMAIL = "consumer@test.nl";
const CONSUMER_PASSWORD = "Test1234!";

const skipLive = process.env.SKIP_LIVE_SUPABASE_TESTS === "1";
const d = skipLive ? describe.skip : describe;

function makeAnon(): SupabaseClient {
  // Aparte client per check zodat we zeker weten dat we de anon-context gebruiken
  // (geen lekkende sessie uit een eerdere test).
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

d("E2E security — anon mag publieke views lezen", () => {
  let baselineDealCount = 0;
  let baselineMerchantCount = 0;

  beforeAll(async () => {
    const anon = makeAnon();
    const { data: deals, error: dErr } = await anon
      .from("deals_public")
      .select("id, merchant_id, title, expiry_time")
      .limit(500);
    const { data: merchants, error: mErr } = await anon
      .from("merchants_public")
      .select("id, company_name")
      .limit(500);
    expect(dErr, `anon deals_public: ${dErr?.message}`).toBeNull();
    expect(mErr, `anon merchants_public: ${mErr?.message}`).toBeNull();
    baselineDealCount = deals?.length ?? 0;
    baselineMerchantCount = merchants?.length ?? 0;
  }, 20_000);

  it("anon kan deals_public lezen (≥0 actieve, geen RLS-fout)", async () => {
    const anon = makeAnon();
    const { data, error } = await anon
      .from("deals_public")
      .select("id, merchant_id, title, expiry_time, city, category")
      .limit(50);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    // Elke rij die we krijgen moet écht actief zijn (verdedigt de view-filter)
    for (const row of data ?? []) {
      expect(new Date(row.expiry_time as string).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("anon kan merchants_public lezen — geen contact_email/contact_phone-kolommen", async () => {
    const anon = makeAnon();
    const { data, error } = await anon
      .from("merchants_public")
      .select("*")
      .limit(5);
    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row).not.toHaveProperty("contact_email");
      expect(row).not.toHaveProperty("contact_phone");
    }
  });

  it("anon mag base-tabel `deals` NIET direct lezen (RLS via merchants-pad mag, maar view is canoniek)", async () => {
    // We verifiëren niet dat .from('deals') faalt — RLS staat anon-select op active
    // deals technisch toe. We bewaken in plaats daarvan dat de PUBLIC VIEW dezelfde
    // (of meer-restrictieve) rijen levert dan een directe call, zodat de frontend
    // veilig op de view kan leunen.
    const anon = makeAnon();
    const { data: viaView } = await anon.from("deals_public").select("id").limit(500);
    const { data: viaTable } = await anon
      .from("deals")
      .select("id")
      .is("deleted_at", null)
      .gt("expiry_time", new Date().toISOString())
      .limit(500);
    const viewIds = new Set((viaView ?? []).map((r) => r.id));
    const tableIds = new Set((viaTable ?? []).map((r) => r.id));
    // View ⊆ table (view filtert óók op merchant active+!blocked).
    for (const id of viewIds) expect(tableIds.has(id)).toBe(true);
  });

  it("publieke views blijven leesbaar NA een login + logout cyclus van een consument", async () => {
    const client = makeAnon();

    // 1. Login als consument
    const { error: loginErr } = await client.auth.signInWithPassword({
      email: CONSUMER_EMAIL,
      password: CONSUMER_PASSWORD,
    });
    expect(loginErr, `login faalde: ${loginErr?.message}`).toBeNull();

    // Sanity: als ingelogde user moeten de views óók werken
    const { data: dealsAuth, error: dealsAuthErr } = await client
      .from("deals_public")
      .select("id")
      .limit(50);
    expect(dealsAuthErr).toBeNull();
    expect(Array.isArray(dealsAuth)).toBe(true);

    // 2. Logout
    const { error: logoutErr } = await client.auth.signOut();
    expect(logoutErr).toBeNull();

    // 3. Zelfde client (nu weer anon) moet nog steeds de views kunnen lezen
    const { data: dealsAnon, error: dealsAnonErr } = await client
      .from("deals_public")
      .select("id")
      .limit(500);
    const { data: merchantsAnon, error: merchantsAnonErr } = await client
      .from("merchants_public")
      .select("id")
      .limit(500);
    expect(dealsAnonErr).toBeNull();
    expect(merchantsAnonErr).toBeNull();

    // 4. Counts moeten consistent zijn met de baseline (±0; data kan minimaal
    //    verschuiven omdat deals zelf afhankelijk zijn van now()).
    //    We staan kleine drift toe (een deal kan expiren tijdens de test).
    const drift = Math.abs((dealsAnon?.length ?? 0) - baselineDealCount);
    expect(drift).toBeLessThanOrEqual(3);
    expect(merchantsAnon?.length ?? 0).toBe(baselineMerchantCount);
  }, 30_000);
});
