import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDeal } from "@/hooks/useDeals";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowLeft, Info, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { useDealEvents } from "@/hooks/useDealAnalytics";
import { useMemo } from "react";

export default function DealAnalytics() {
  const { dealId } = useParams<{ dealId: string }>();
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const { data: deal, isLoading: dealLoading } = useDeal(dealId!);
  const { data: events, isLoading: eventsLoading } = useDealEvents(dealId!, "all");

  const kpis = useMemo(() => {
    const views = events?.filter(e => e.event_type === "view").length || 0;
    const websiteClicks = events?.filter(e => e.event_type === "checkout_click").length || 0;
    const conversion = views > 0 ? (websiteClicks / views) * 100 : 0;
    return { views, websiteClicks, conversion };
  }, [events]);

  if (!authLoading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  if (dealLoading || authLoading) {
    return (
      <div className="container py-6 max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
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

  const isExpired = new Date(deal.expiry_time) < new Date();

  return (
    <div className="container py-6 max-w-5xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to={`/merchant/deals/${dealId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />Terug naar advertentiebeheer
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-bold">Analytics: {deal.title}</h1>
          <Badge variant={isExpired ? "secondary" : "default"}>
            {isExpired ? "Verlopen" : "Actief"}
          </Badge>
        </div>
      </div>

      {eventsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard icon={<Eye className="h-4 w-4" />} label="Views" value={kpis.views} tooltip="Aantal keer dat de advertentie is bekeken" />
          <KPICard icon={<MousePointerClick className="h-4 w-4" />} label="Kliks-naar-website" value={kpis.websiteClicks} tooltip="Aantal keer dat er naar de website is doorgeklikt" />
          <KPICard icon={<TrendingUp className="h-4 w-4" />} label="Conversie" value={`${kpis.conversion.toFixed(1)}%`} tooltip="Kliks-naar-website / Views" />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Statistieken over de volledige looptijd van deze advertentie (max. 24 uur).
      </p>
    </div>
  );
}

function KPICard({ icon, label, value, tooltip }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tooltip: string;
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
        <p className="font-display text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
