import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Step 1: Mark vouchers as inactive where deal has expired and not yet marked
    const { data: newlyInactive, error: markError } = await supabase
      .from("vouchers")
      .update({ status: "inactive", became_inactive_at: now })
      .is("became_inactive_at", null)
      .eq("status", "active")
      .select("id, deal_id");

    // For each, check if the deal is actually expired
    if (newlyInactive && newlyInactive.length > 0) {
      const dealIds = [...new Set(newlyInactive.map((v: any) => v.deal_id))];
      const { data: deals } = await supabase
        .from("deals")
        .select("id, expiry_time")
        .in("id", dealIds);

      const expiredDealIds = new Set(
        (deals || [])
          .filter((d: any) => new Date(d.expiry_time) < new Date())
          .map((d: any) => d.id)
      );

      // Revert vouchers whose deal is NOT actually expired
      const stillActiveVoucherIds = newlyInactive
        .filter((v: any) => !expiredDealIds.has(v.deal_id))
        .map((v: any) => v.id);

      if (stillActiveVoucherIds.length > 0) {
        await supabase
          .from("vouchers")
          .update({ status: "active", became_inactive_at: null })
          .in("id", stillActiveVoucherIds);
      }
    }

    // Step 2: Archive vouchers that have been inactive for 24+ hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: archived, error: archiveError } = await supabase
      .from("vouchers")
      .update({
        status: "archived",
        archived_at: now,
        deleted_at: now,
      })
      .eq("status", "inactive")
      .not("became_inactive_at", "is", null)
      .lte("became_inactive_at", cutoff)
      .select("id");

    return new Response(
      JSON.stringify({
        marked_inactive: newlyInactive?.length || 0,
        archived: archived?.length || 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
