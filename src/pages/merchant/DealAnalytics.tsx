import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDeal } from "@/hooks/useDeals";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Info, Eye, MousePointerClick, ShoppingCart, TrendingUp, RotateCcw, CheckCircle } from "lucide-react";
import { useAnalyticsKPIs, useEventTimeSeries, type Period } from "@/hooks/useDealAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "24h", label: "24u" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "Alles" },
];

export default function DealAnalytics() {
  const { dealId } = useParams<{ dealId: string }>();
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const { data: deal, isLoading: dealLoading } = useDeal(dealId!);
  const [period, setPeriod] = useState<Period>("30d");
  const { kpis, isLoading: analyticsLoading, events, sales } = useAnalyticsKPIs(dealId!, period);
  const eventTimeSeries = useEventTimeSeries(events);
  const queryClient = useQueryClient();

  // Manual sales entry state
  const [salesDate, setSalesDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [salesCount, setSalesCount] = useState("");
  const [refundsCount, setRefundsCount] = useState("");
  const [redeemedCount, setRedeemedCount] = useState("");
  const [saving, setSaving] = useState(false);

  if (!authLoading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  if (dealLoading || authLoading) {
    return (
      <div className="container py-6 max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="container py-16 text-center">
        <h2 className="font-display text-xl font-semibold">Advertentie niet gevonden</h2>
        <Button variant="link" asChild className="mt-4">
          <Link to="/merchant">Terug naar dashboard</Link>
        </Button>
      </div>
    );
  }

  if (merchant && deal.merchant_id !== merchant.id) {
    return (
      <div className="container py-16 text-center">
        <h2 className="font-display text-xl font-semibold">Geen toegang</h2>
        <Button variant="link" asChild className="mt-4">
          <Link to="/merchant">Terug naar dashboard</Link>
        </Button>
      </div>
    );
  }

  const handleSaveSales = async () => {
    if (!dealId) return;
    const s = parseInt(salesCount) || 0;
    const r = parseInt(refundsCount) || 0;
    const rd = parseInt(redeemedCount) || 0;

    if (r > s) {
      toast({ title: "Fout", description: "Refunds kunnen niet hoger zijn dan verkopen.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("deal_sales_daily").upsert(
      { deal_id: dealId, date: salesDate, sales: s, refunds: r, redeemed: rd, source: "manual" },
      { onConflict: "deal_id,date,source" }
    );

    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Opgeslagen" });
      setSalesCount("");
      setRefundsCount("");
      setRedeemedCount("");
      queryClient.invalidateQueries({ queryKey: ["deal-sales-daily", dealId] });
    }
    setSaving(false);
  };

  const isExpired = new Date(deal.expiry_time) < new Date();

  const chartConfig = {
    views: { label: "Views", color: "hsl(48, 96%, 53%)" },
    detailClicks: { label: "Detail-kliks", color: "hsl(142, 71%, 45%)" },
    checkoutClicks: { label: "Checkout-kliks", color: "hsl(0, 84%, 60%)" },
  };

  const salesChartConfig = {
    sales: { label: "Verkopen", color: "hsl(142, 71%, 45%)" },
    refunds: { label: "Refunds", color: "hsl(0, 84%, 60%)" },
  };

  const salesTimeSeries = (sales || []).map(s => ({
    date: s.date,
    sales: s.sales,
    refunds: s.refunds,
  }));

  return (
    <div className="container py-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to={`/merchant/deals/${dealId}`}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar advertentiebeheer</Link>
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">Analytics: {deal.title}</h1>
            <Badge variant={isExpired ? "secondary" : "default"}>
              {isExpired ? "Verlopen" : "Actief"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            variant={period === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={<Eye className="h-4 w-4" />} label="Views" value={kpis.views} tooltip="Aantal keer dat de detailpagina is geladen" />
          <KPICard icon={<MousePointerClick className="h-4 w-4" />} label="Detail-kliks" value={kpis.detailClicks} tooltip="Aantal keer dat gebruikers de deal hebben geclaimd" />
          <KPICard icon={<ShoppingCart className="h-4 w-4" />} label="Checkout-kliks" value={kpis.checkoutClicks} tooltip="Aantal keer dat de checkout/afrekenen knop is geklikt" />
          <KPICard icon={<TrendingUp className="h-4 w-4" />} label="Checkout-conversie" value={`${kpis.checkoutConversion.toFixed(1)}%`} tooltip="Checkout-kliks / Views" />
          <KPICard
            icon={<ShoppingCart className="h-4 w-4" />}
            label="Verkopen"
            value={kpis.hasSalesData ? kpis.totalSales : "—"}
            tooltip="Totaal verkopen (handmatig ingevoerd)"
            muted={!kpis.hasSalesData}
          />
          <KPICard
            icon={<RotateCcw className="h-4 w-4" />}
            label="Refund-%"
            value={kpis.hasSalesData ? `${kpis.refundPct.toFixed(1)}%` : "—"}
            tooltip="Refunds / Verkopen"
            muted={!kpis.hasSalesData}
          />
          <KPICard
            icon={<CheckCircle className="h-4 w-4" />}
            label="Inwissel-%"
            value={kpis.hasSalesData ? `${kpis.redeemPct.toFixed(1)}%` : "—"}
            tooltip="Ingewisseld / Verkopen"
            muted={!kpis.hasSalesData}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Views & kliks over tijd</CardTitle>
          </CardHeader>
          <CardContent>
            {eventTimeSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nog geen data in deze periode</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={eventTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="views" fill="var(--color-views)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="detailClicks" fill="var(--color-detailClicks)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="checkoutClicks" fill="var(--color-checkoutClicks)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verkopen & refunds over tijd</CardTitle>
          </CardHeader>
          <CardContent>
            {salesTimeSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nog geen verkoopdata. Voeg hieronder data toe.</p>
            ) : (
              <ChartContainer config={salesChartConfig} className="h-[250px] w-full">
                <LineChart data={salesTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.slice(5)} />
                  <YAxis fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="refunds" stroke="var(--color-refunds)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual sales entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verkopen & refunds toevoegen</CardTitle>
          <p className="text-sm text-muted-foreground">
            Betalingen lopen via jouw eigen checkout. Voeg verkoopdata toe om conversie, verkopen en refunds te zien.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList>
              <TabsTrigger value="manual">Handmatig</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="sales-date">Datum</Label>
                  <Input id="sales-date" type="date" value={salesDate} onChange={e => setSalesDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="sales-count">Verkopen</Label>
                  <Input id="sales-count" type="number" min="0" placeholder="0" value={salesCount} onChange={e => setSalesCount(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="refunds-count">Refunds</Label>
                  <Input id="refunds-count" type="number" min="0" placeholder="0" value={refundsCount} onChange={e => setRefundsCount(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="redeemed-count">Ingewisseld</Label>
                  <Input id="redeemed-count" type="number" min="0" placeholder="0" value={redeemedCount} onChange={e => setRedeemedCount(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSaveSales} disabled={saving}>
                {saving ? "Opslaan..." : "Opslaan"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon, label, value, tooltip, muted }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tooltip: string;
  muted?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{icon}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent><p className="text-xs max-w-[200px]">{tooltip}</p></TooltipContent>
          </Tooltip>
        </div>
        <p className={`font-display text-2xl font-bold ${muted ? "text-muted-foreground" : ""}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
