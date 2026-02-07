import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export type Period = "24h" | "7d" | "30d" | "all";

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all": return null;
  }
}

export function useDealEvents(dealId: string, period: Period) {
  return useQuery({
    queryKey: ["deal-events-analytics", dealId, period],
    queryFn: async () => {
      let query = supabase
        .from("deal_events")
        .select("event_type, created_at")
        .eq("deal_id", dealId);

      const start = getPeriodStart(period);
      if (start) {
        query = query.gte("created_at", start.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

export function useDealSalesDaily(dealId: string, period: Period) {
  return useQuery({
    queryKey: ["deal-sales-daily", dealId, period],
    queryFn: async () => {
      let query = supabase
        .from("deal_sales_daily")
        .select("*")
        .eq("deal_id", dealId)
        .order("date", { ascending: true });

      const start = getPeriodStart(period);
      if (start) {
        const dateStr = start.toISOString().split("T")[0];
        query = query.gte("date", dateStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!dealId,
  });
}

export function useAnalyticsKPIs(dealId: string, period: Period) {
  const { data: events, isLoading: eventsLoading } = useDealEvents(dealId, period);
  const { data: sales, isLoading: salesLoading } = useDealSalesDaily(dealId, period);

  const kpis = useMemo(() => {
    const views = events?.filter(e => e.event_type === "view").length || 0;
    const detailClicks = events?.filter(e => e.event_type === "click").length || 0;
    const checkoutClicks = events?.filter(e => e.event_type === "checkout_click").length || 0;
    const checkoutConversion = views > 0 ? (checkoutClicks / views) * 100 : 0;

    const totalSales = sales?.reduce((sum, s) => sum + (s.sales || 0), 0) || 0;
    const totalRefunds = sales?.reduce((sum, s) => sum + (s.refunds || 0), 0) || 0;
    const totalRedeemed = sales?.reduce((sum, s) => sum + (s.redeemed || 0), 0) || 0;
    const refundPct = totalSales > 0 ? (totalRefunds / totalSales) * 100 : 0;
    const redeemPct = totalSales > 0 ? (totalRedeemed / totalSales) * 100 : 0;
    const hasSalesData = (sales?.length || 0) > 0;

    return {
      views, detailClicks, checkoutClicks, checkoutConversion,
      totalSales, totalRefunds, totalRedeemed,
      refundPct, redeemPct, hasSalesData,
    };
  }, [events, sales]);

  return { kpis, isLoading: eventsLoading || salesLoading, events, sales };
}

export function useEventTimeSeries(events: Array<{ event_type: string; created_at: string }> | undefined) {
  return useMemo(() => {
    if (!events?.length) return [];
    const byDate: Record<string, { date: string; views: number; detailClicks: number; checkoutClicks: number }> = {};
    for (const e of events) {
      const date = e.created_at.split("T")[0];
      if (!byDate[date]) byDate[date] = { date, views: 0, detailClicks: 0, checkoutClicks: 0 };
      if (e.event_type === "view") byDate[date].views++;
      else if (e.event_type === "click") byDate[date].detailClicks++;
      else if (e.event_type === "checkout_click") byDate[date].checkoutClicks++;
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);
}
