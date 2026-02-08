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
      .update({ became_inactive_at: now })
      .is("became_inactive_at", null)
      .is("deleted_at", null)
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

      // Only keep became_inactive_at for vouchers whose deal is actually expired
      const stillActiveVoucherIds = newlyInactive
        .filter((v: any) => !expiredDealIds.has(v.deal_id))
        .map((v: any) => v.id);

      if (stillActiveVoucherIds.length > 0) {
        await supabase
          .from("vouchers")
          .update({ became_inactive_at: null })
          .in("id", stillActiveVoucherIds);
      }
    }

    // Step 2: Soft-delete vouchers that have been inactive for 24+ hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: deleted, error: deleteError } = await supabase
      .from("vouchers")
      .update({ deleted_at: now })
      .is("deleted_at", null)
      .not("became_inactive_at", "is", null)
      .lte("became_inactive_at", cutoff)
      .select("id");

    return new Response(
      JSON.stringify({
        marked_inactive: newlyInactive?.length || 0,
        soft_deleted: deleted?.length || 0,
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
