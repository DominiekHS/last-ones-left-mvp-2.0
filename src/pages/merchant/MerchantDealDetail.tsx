import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDeal } from "@/hooks/useDeals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { friendlyDbError } from "@/lib/friendly-errors";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { ArrowLeft, Pencil, Trash2, ExternalLink, Eye, MousePointerClick, BarChart3, AlertTriangle, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DangerConfirmDialog } from "@/components/admin/DangerConfirmDialog";
import { useState } from "react";

export default function MerchantDealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const { data: deal, isLoading } = useDeal(dealId!);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["deal-stats", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_events")
        .select("event_type")
        .eq("deal_id", dealId!);
      if (error) return { views: 0, clicks: 0 };
      const views = data.filter((e) => e.event_type === "view").length;
      const clicks = data.filter((e) => e.event_type === "click").length;
      return { views, clicks };
    },
    enabled: !!dealId,
  });

  const { data: uniqueCodeStats } = useQuery({
    queryKey: ["unique-codes-stats", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unique_codes")
        .select("status")
        .eq("deal_id", dealId!);
      if (error) return null;
      const total = data.length;
      const available = data.filter((c) => c.status === "available").length;
      const assigned = data.filter((c) => c.status !== "available").length;
      return { total, available, assigned };
    },
    enabled: !!dealId && !!deal && deal.discount_type === "unique",
  });

  if (!authLoading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  if (isLoading || authLoading) {
    return (
      <div className="container py-6 max-w-4xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
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
        <p className="text-muted-foreground mt-2">Je kunt alleen je eigen advertenties bekijken.</p>
        <Button variant="link" asChild className="mt-4">
          <Link to="/merchant">Terug naar dashboard</Link>
        </Button>
      </div>
    );
  }

  const isExpired = new Date(deal.expiry_time) < new Date();
  const isVariableAmount = (deal as any).counter_discount_mode === "variable_amount" && deal.redemption_method === "at_counter";
  const discountedPrice = deal.original_price * (1 - deal.discount_percentage / 100);
  const hasCheckoutLink = deal.redemption_method === "online_checkout" || deal.redemption_method === "online_pay_pos_refund";
  const methodLabel =
    deal.redemption_method === "online_checkout"
      ? "Online (checkout link)"
      : deal.redemption_method === "online_pay_pos_refund"
      ? "Online betalen, korting aan kassa"
      : "Aan de kassa";

  const handleDelete = () => setConfirmOpen(true);

  const confirmDelete = async () => {
    setDeleting(true);
    // Soft-delete: rij blijft fysiek bestaan en kan door admin teruggezet worden.
    const { error } = await supabase
      .from("deals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deal.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Fout", description: friendlyDbError(error), variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["deals", "merchant"] });
      toast({ title: "Advertentie verwijderd" });
      navigate("/merchant");
    }
  };

  return (
    <div className="container py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3">
          <Link to="/merchant"><ArrowLeft className="mr-1 h-4 w-4" />Terug naar dashboard</Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold">{deal.title}</h1>
            <Badge variant={isExpired ? "secondary" : "default"}>
              {isExpired ? "Verlopen" : "Actief"}
            </Badge>
            <Badge variant="outline">{CATEGORY_LABELS[deal.category]}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/deal/${deal.id}`}><Eye className="mr-1 h-4 w-4" />Bekijk advertentie</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/merchant/deals/${deal.id}/analytics`}><BarChart3 className="mr-1 h-4 w-4" />Analytics</Link>
            </Button>
            {isExpired ? (
              <Button size="sm" asChild>
                <Link to={`/merchant/ads/new?copyFrom=${deal.id}`}><Copy className="mr-1 h-4 w-4" />Kopieer advertentie</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/merchant/ads/${deal.id}/edit`}><Pencil className="mr-1 h-4 w-4" />Bewerk</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-1 h-4 w-4" />Verwijder
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alert when all unique codes are used */}
      {deal.discount_type === "unique" && uniqueCodeStats && uniqueCodeStats.available === 0 && uniqueCodeStats.total > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Alle {uniqueCodeStats.total} unieke kortingscodes zijn gebruikt. Deze advertentie is automatisch op inactief gezet. 
            Kopieer en bewerk de advertentie om een nieuwe advertentie te maken.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats bar */}
      <div className="flex gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{stats?.views || 0} weergaven</span>
        <span className="flex items-center gap-1"><MousePointerClick className="h-4 w-4" />{stats?.clicks || 0} klikken</span>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1 — Deal informatie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal informatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Korting" value={`${deal.discount_percentage}%`} />
            <InfoRow label="Originele prijs" value={isVariableAmount ? "n.v.t. (bedrag varieert)" : `€${Number(deal.original_price).toFixed(2)}`} />
            {!isVariableAmount && <InfoRow label="Prijs na korting" value={`€${discountedPrice.toFixed(2)}`} />}
            {isVariableAmount && <InfoRow label="Prijstype" value="Bedrag varieert per klant" />}
            <InfoRow label="Stad" value={deal.city || "—"} />
            <InfoRow label="Postcode" value={(deal as any).postal_code || "—"} />
            <InfoRow label="Adres" value={deal.address || "—"} />
            {deal.start_time && (
              <InfoRow
                label="Starttijd"
                value={format(new Date(deal.start_time), "d MMMM yyyy HH:mm", { locale: nl })}
              />
            )}
            <InfoRow
              label="Verloopt op"
              value={format(new Date(deal.expiry_time), "d MMMM yyyy HH:mm", { locale: nl })}
            />
            {deal.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Omschrijving</p>
                <p className="text-sm leading-relaxed">{deal.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Verzilvering */}
        <div className="relative">
          <div className="absolute -top-10 right-0">
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-1 h-3 w-3" />Verwijder advertentie
            </Button>
          </div>
          <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verzilvering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Methode"
              value={methodLabel}
            />
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Checkout link</p>
              {hasCheckoutLink ? (
                deal.checkout_link ? (
                  <a
                    href={deal.checkout_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
                  >
                    {deal.checkout_link} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm text-destructive">Ontbrekende checkout link</p>
                )
              ) : (
                <p className="text-sm">n.v.t.</p>
              )}
            </div>
            <InfoRow
              label="Kortingstype"
              value={deal.discount_type === "unique" ? "Unieke codes" : "Universele code"}
            />
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Kortingscode</p>
              {deal.discount_type === "unique" ? (
                uniqueCodeStats ? (
                  <div className="text-sm space-y-1">
                    <p>Aantal codes: {uniqueCodeStats.total}</p>
                    <p>Beschikbaar: {uniqueCodeStats.available}</p>
                    <p>Toegewezen: {uniqueCodeStats.assigned}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen codes gevonden</p>
                )
              ) : (
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{deal.discount_code || "—"}</code>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <DangerConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Advertentie verwijderen?"
        description={`"${deal.title}" wordt verwijderd. Een admin kan dit binnen korte tijd terugdraaien.`}
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
