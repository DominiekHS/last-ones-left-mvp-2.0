import { useAuth } from "@/hooks/useAuth";
import { useMerchantDeals } from "@/hooks/useDeals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Navigate } from "react-router-dom";
import { Plus, Trash2, Pencil, Eye, MousePointerClick, ChevronRight, AlertTriangle, Ban, AlertCircle, Copy } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { CATEGORY_LABELS } from "@/lib/constants";
import { getMerchantEffectiveStatus } from "@/lib/merchant-status";
type DealFilter = "all" | "active" | "expired";

export default function MerchantDashboard() {
  const { user, merchant, roles, loading } = useAuth();
  const { data: deals, isLoading } = useMerchantDeals(merchant?.id);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<DealFilter>("all");

  if (!loading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  if (!merchant) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Merchant profiel laden...</p>
      </div>
    );
  }

  const merchantStatus = getMerchantEffectiveStatus(merchant as any);

  // Blocked merchants see a full block screen
  if (merchantStatus === "blocked") {
    return (
      <div className="container py-16 text-center space-y-4">
        <Ban className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="font-display text-xl font-semibold">Account geblokkeerd</h2>
        <p className="text-muted-foreground">Je account is geblokkeerd. Neem contact op met ons support team voor meer informatie.</p>
        <Button asChild variant="outline"><Link to="/contact">Contact opnemen</Link></Button>
      </div>
    );
  }
  const handleDelete = async (dealId: string) => {
    if (!confirm("Weet je zeker dat je deze deal wilt verwijderen?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["deals", "merchant"] });
      toast({ title: "Deal verwijderd" });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {merchantStatus === "suspended" && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Je account is geschorst</p>
            <p className="text-muted-foreground">
              Tot {merchant.suspended_until ? format(new Date(merchant.suspended_until), "d MMMM yyyy HH:mm", { locale: nl }) : "nader order"}.
              Je kunt geen deals aanmaken of bewerken. Neem contact op als je vragen hebt.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Mijn Advertenties</h1>
          <p className="text-muted-foreground">{merchant.company_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/merchant/profiel"><Pencil className="mr-1 h-3 w-3" />Profiel</Link>
          </Button>
          {merchantStatus === "active" && (
            <Button asChild>
              <Link to="/merchant/ads/new"><Plus className="mr-1 h-4 w-4" />Advertentie maken</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(["all", "active", "expired"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Alle" : f === "active" ? "Actief" : "Verlopen (kopieer hier je advertenties)"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : deals && deals.length > 0 ? (
        <div className="space-y-3">
          {deals
            .filter((deal) => {
              const isExpired = new Date(deal.expiry_time) < new Date();
              if (filter === "active") return !isExpired;
              if (filter === "expired") return isExpired;
              return true;
            })
            .map((deal) => {
              const isExpired = new Date(deal.expiry_time) < new Date();
              return (
                <DealRow
                  key={deal.id}
                  deal={deal}
                  isExpired={isExpired}
                  merchantId={merchant.id}
                  onDelete={() => handleDelete(deal.id)}
                />
              );
            })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Je hebt nog geen deals geplaatst.</p>
            <Button asChild>
              <Link to="/merchant/ads/new">Eerste advertentie plaatsen</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DealRow({ deal, isExpired, merchantId, onDelete }: {
  deal: any;
  isExpired: boolean;
  merchantId: string;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const { data: stats } = useQuery({
    queryKey: ["deal-stats", deal.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_events")
        .select("event_type")
        .eq("deal_id", deal.id);
      if (error) return { views: 0, clicks: 0 };
      const views = data.filter((e) => e.event_type === "view").length;
      const clicks = data.filter((e) => e.event_type === "click").length;
      return { views, clicks };
    },
  });

  const { data: uniqueCodeStats } = useQuery({
    queryKey: ["unique-codes-stats", deal.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unique_codes")
        .select("status")
        .eq("deal_id", deal.id);
      if (error) return null;
      const total = data.length;
      const available = data.filter((c) => c.status === "available").length;
      return { total, available };
    },
    enabled: deal.discount_type === "unique",
  });

  const allCodesUsed = deal.discount_type === "unique" && uniqueCodeStats && uniqueCodeStats.available === 0 && uniqueCodeStats.total > 0;

  return (
    <Card
      className="cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => navigate(`/merchant/deals/${deal.id}`)}
    >
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold">{deal.title}</h3>
            <Badge variant={isExpired ? "secondary" : "default"} className="text-xs">
              {isExpired ? "Verlopen" : "Actief"}
            </Badge>
            <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[deal.category]}</Badge>
            {allCodesUsed && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="mr-1 h-3 w-3" />Alle codes op
              </Badge>
            )}
            {isExpired ? (
              <Button size="sm" asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Link to={`/merchant/ads/new?copyFrom=${deal.id}`}><Copy className="mr-1 h-3 w-3" />Kopieer</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="text-success border-success/50 hover:bg-success/10 hover:text-success" asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Link to={`/merchant/ads/${deal.id}/edit`}><Pencil className="h-3 w-3" /></Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {deal.city}{deal.start_time ? ` · Start: ${format(new Date(deal.start_time), "d MMM HH:mm", { locale: nl })}` : ""} · Eind: {format(new Date(deal.expiry_time), "d MMM HH:mm", { locale: nl })} ·{" "}
            -{deal.discount_percentage}% · €{(deal.original_price * (1 - deal.discount_percentage / 100)).toFixed(2)}
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{stats?.views || 0} weergaven</span>
            <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{stats?.clicks || 0} klikken</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
