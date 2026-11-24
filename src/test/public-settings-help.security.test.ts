import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const config = readFileSync(`${process.cwd()}/.env`, "utf8");
function publicConfig(name: string) {
  return config.match(new RegExp(`^${name}=["']?([^"'\\r\\n]+)`, "m"))?.[1];
}
const url = publicConfig("VITE_SUPABASE_URL");
const key = publicConfig("VITE_SUPABASE_PUBLISHABLE_KEY");
const live = process.env.SKIP_LIVE_SUPABASE_TESTS !== "1" && Boolean(url && key);

function makeClient() {
  if (!url || !key) throw new Error("Public project configuration missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

describe.runIf(live)("Public settings and Helpcenter access", () => {
  it("anonymous visitors cannot read settings or admin metadata", async () => {
    const { data, error } = await makeClient().from("app_settings").select("*");
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("the public endpoint exposes only the two required boolean flags", async () => {
    const { data, error } = await makeClient().rpc("get_public_app_settings");
    expect(error).toBeNull();
    expect(data?.map((row: { key: string }) => row.key).sort()).toEqual([
      "email_verification_required", "merchant_signup_enabled",
    ]);
    for (const row of data ?? []) {
      expect(Object.keys(row).sort()).toEqual(["key", "value"]);
      expect(typeof row.value).toBe("boolean");
    }
  });

  it("existing public Helpcenter categories remain accessible", async () => {
    const { data, error } = await makeClient().from("help_categories").select("id,is_published");
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    for (const row of data ?? []) expect(row.is_published).toBe(true);
  });

  it("unpublished Helpcenter categories cannot be read directly", async () => {
    const { data, error } = await makeClient().from("help_categories").select("id").eq("is_published", false);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it.runIf(Boolean(process.env.TEST_CONSUMER_EMAIL && process.env.TEST_CONSUMER_PASSWORD))(
    "signed-in consumers cannot read private settings", async () => {
      const client = makeClient();
      const { error: loginError } = await client.auth.signInWithPassword({
        email: process.env.TEST_CONSUMER_EMAIL ?? "",
        password: process.env.TEST_CONSUMER_PASSWORD ?? "",
      });
      expect(loginError).toBeNull();
      try {
        const { data, error } = await client.from("app_settings").select("*");
        expect(error).toBeNull();
        expect(data).toEqual([]);
      } finally {
        await client.auth.signOut();
      }
    }, 20_000,
  );
});