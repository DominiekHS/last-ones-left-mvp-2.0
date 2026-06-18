import { useParams, useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { friendlyDbError } from "@/lib/friendly-errors";
import { ArrowLeft, Trash2, ExternalLink, Eye, MousePointerClick, Store } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CATEGORY_LABELS } from "@/lib/constants";
import { recordAdminAction } from "@/lib/audit";

export default function AdminDealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["admin-deal", dealId],
    queryFn: async () => {
      // NB: 'discount_code' is bewust uitgesloten — geen SELECT-grant op die kolom.
      // We halen 'm hieronder op via de RPC get_my_deal_code (admin is geautoriseerd).
      const { data, error } = await supabase
        .from("deals")
        .select(
          "id, merchant_id, title, description, image_url, category, city, original_price, discount_percentage, start_time, expiry_time, checkout_link, created_at, updated_at, address, redemption_method, discount_type, redemption_instructions, cancellation_policy, terms_summary, counter_discount_mode, postal_code, pricing_model, indicative_price_from, price_per_person, start_time_mode, payment_steps, notification_sent_at, deleted_at, merchants(id, company_name, city, contact_email)"
        )
        .eq("id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin") && !!dealId,
  });

  const { data: discountCode } = useQuery({
    queryKey: ["admin-deal-code", dealId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_deal_code", { p_deal_id: dealId! });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    enabled: roles.includes("admin") && !!dealId && deal?.discount_type === "universal",
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-deal-stats", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_events")
        .select("event_type, created_at")
        .eq("deal_id", dealId!);
      if (error) throw error;
      const views = data.filter((e) => e.event_type === "view").length;
      const clicks = data.filter((e) => e.event_type === "click").length;
      const lastEvent = data.length > 0
        ? data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;
      return { views, clicks, lastEvent };
    },
    enabled: roles.includes("admin") && !!dealId,
  });

  const { data: uniqueCodeStats } = useQuery({
    queryKey: ["admin-deal-codes", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unique_codes")
        .select("status")
        .eq("deal_id", dealId!);
      if (error) throw error;
      const total = data.length;
      const available = data.filter((c) => c.status === "available").length;
      const assigned = data.filter((c) => c.status !== "available").length;
      return { total, available, assigned };
    },
    enabled: roles.includes("admin") && !!dealId && deal?.discount_type === "unique",
  });

  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  const deleteDeal = async () => {
    // Soft-delete: rij blijft fysiek bestaan, herstel mogelijk via DB.
    const { error } = await supabase
      .from("deals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", dealId!);
    if (error) {
      toast({ title: "Fout", description: friendlyDbError(error), variant: "destructive" });
    } else {
      void recordAdminAction({
        action_type: "deal_delete",
        target_type: "deal",
        target_id: dealId!,
        reason: "Soft-delete via deal-detail",
        metadata: { merchant_id: deal?.merchants?.id ?? null },
      });
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast({ title: "Deal verwijderd" });
      navigate("/admin");
    }
  };

  if (isLoading) {
    return <div className="container py-6"><p className="text-muted-foreground">Laden...</p></div>;
  }

  if (!deal) {
    return (
      <div className="container py-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/admin")}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar overzicht</Button>
        <p className="text-muted-foreground">Deal niet gevonden.</p>
      </div>
    );
  }

  const isExpired = new Date(deal.expiry_time) < new Date();
  const discountedPrice = deal.original_price * (1 - deal.discount_percentage / 100);
  const merchant = deal.merchants as any;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-1 h-4 w-4" />Terug naar overzicht
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/deals/${dealId}/preview`}><Eye className="mr-1 h-4 w-4" />Preview als consument</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-4 w-4" />Verwijder deal</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deal verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je "{deal.title}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction onClick={deleteDeal}>Verwijderen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold">{deal.title}</h1>
        <Badge variant={isExpired ? "secondary" : "default"}>{isExpired ? "Verlopen" : "Actief"}</Badge>
        <Badge variant="outline">{CATEGORY_LABELS[deal.category]}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Deal basis */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Deal informatie</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Korting" value={`${deal.discount_percentage}%`} />
            <InfoRow label="Originele prijs" value={`€${deal.original_price.toFixed(2)}`} />
            <InfoRow label="Prijs na korting" value={`€${discountedPrice.toFixed(2)}`} />
            <InfoRow label="Stad" value={deal.city} />
            {(deal as any).postal_code && <InfoRow label="Postcode" value={(deal as any).postal_code} />}
            {deal.address && <InfoRow label="Adres" value={deal.address} />}
            <InfoRow label="Starttijd modus" value={(deal as any).start_time_mode === "flexible" ? "Flexibel" : "Vast"} />
            {deal.start_time && (deal as any).start_time_mode !== "flexible" && (
              <InfoRow label="Starttijd" value={format(new Date(deal.start_time), "d MMMM yyyy HH:mm", { locale: nl })} />
            )}
            <InfoRow label="Verloopt op" value={format(new Date(deal.expiry_time), "d MMMM yyyy HH:mm", { locale: nl })} />
            {deal.description && <InfoRow label="Omschrijving" value={deal.description} />}
          </CardContent>
        </Card>

        {/* Verzilvering */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Verzilvering</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow
              label="Methode"
              value={deal.redemption_method === "online_checkout" ? "Online (checkout link)" : "Korting aan de kassa"}
            />
            {deal.checkout_link && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Checkout link:</span>
                <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                  Openen <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <InfoRow label="Kortingstype" value={deal.discount_type === "unique" ? "Unieke codes" : "Universele code"} />
            {deal.discount_type === "universal" && deal.discount_code && (
              <InfoRow label="Kortingscode" value={deal.discount_code} />
            )}
            {deal.discount_type === "unique" && uniqueCodeStats && (
              <div className="space-y-1">
                <InfoRow label="Totaal codes" value={String(uniqueCodeStats.total)} />
                <InfoRow label="Beschikbaar" value={String(uniqueCodeStats.available)} />
                <InfoRow label="Toegewezen" value={String(uniqueCodeStats.assigned)} />
              </div>
            )}
            {deal.redemption_instructions && <InfoRow label="Instructies" value={deal.redemption_instructions} />}
            {deal.terms_summary && <InfoRow label="Voorwaarden" value={deal.terms_summary} />}
            {deal.cancellation_policy && <InfoRow label="Annuleringsbeleid" value={deal.cancellation_policy} />}
          </CardContent>
        </Card>

        {/* Merchant info */}
        {merchant && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Store className="h-4 w-4" />Ondernemer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Bedrijfsnaam:</span>
                <Link to={`/admin/ondernemers/${merchant.id}`} className="text-primary hover:underline font-semibold">
                  {merchant.company_name}
                </Link>
              </div>
              {merchant.city && <InfoRow label="Stad" value={merchant.city} />}
              {merchant.contact_email && <InfoRow label="E-mail" value={merchant.contact_email} />}
            </CardContent>
          </Card>
        )}

        {/* Tracking */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Tracking</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <InfoRow label="Views" value={String(stats?.views ?? 0)} />
            </div>
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              <InfoRow label="Clicks" value={String(stats?.clicks ?? 0)} />
            </div>
            {stats?.lastEvent && (
              <InfoRow label="Laatste activiteit" value={format(new Date(stats.lastEvent), "d MMM yyyy HH:mm", { locale: nl })} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground font-medium">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
