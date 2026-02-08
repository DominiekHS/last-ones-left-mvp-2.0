import { useParams, Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import { MapPin, Clock, ArrowLeft, Share2, FileText, Info } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export default function AdminDealPreview() {
  const { dealId } = useParams<{ dealId: string }>();
  const { user, roles, loading } = useAuth();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["admin-deal-preview", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, merchants(company_name, city, address, description)")
        .eq("id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin") && !!dealId,
  });

  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  if (isLoading) {
    return (
      <div className="container py-6 space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="container py-6 space-y-4">
        <Button variant="ghost" asChild>
          <Link to={`/admin/deals/${dealId}`}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar admin deal</Link>
        </Button>
        <p className="text-muted-foreground">Deal niet gevonden.</p>
      </div>
    );
  }

  const discountedPrice = deal.original_price * (1 - deal.discount_percentage / 100);
  const startDate = new Date(deal.start_time);
  const expiryDate = new Date(deal.expiry_time);
  const isExpired = expiryDate < new Date();

  return (
    <div className="container py-4 max-w-2xl space-y-4">
      <div className="bg-muted border rounded-md px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
        <Info className="h-3 w-3" />
        Je bekijkt dit als admin. Acties zijn uitgeschakeld.
      </div>

      <Button variant="ghost" size="sm" asChild>
        <Link to={`/admin/deals/${dealId}`}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar admin deal</Link>
      </Button>

      {deal.image_url && (
        <div className="aspect-video rounded-lg overflow-hidden bg-muted">
          <img src={deal.image_url} alt={deal.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary text-primary-foreground font-bold">-{deal.discount_percentage}%</Badge>
          <Badge variant="outline">{CATEGORY_LABELS[deal.category]}</Badge>
          {isExpired && <Badge variant="destructive">Verlopen</Badge>}
        </div>

        <h1 className="font-display text-2xl font-bold">{deal.title}</h1>

        {deal.merchants && (
          <p className="text-muted-foreground">
            Aanbieder: {(deal.merchants as any).company_name}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{deal.city}{deal.postal_code ? `, ${deal.postal_code}` : ""}</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Start: {format(startDate, "d MMM HH:mm", { locale: nl })}</span>
          <span>Verloopt {formatDistanceToNow(expiryDate, { locale: nl, addSuffix: true })}</span>
        </div>

        {deal.counter_discount_mode === "variable_amount" && deal.redemption_method === "at_counter" ? (
          <div className="flex items-baseline gap-3">
            <Badge className="bg-primary text-primary-foreground font-bold text-base px-3 py-1">
              {deal.discount_percentage}% korting aan de kassa
            </Badge>
          </div>
        ) : (
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">€{discountedPrice.toFixed(2)}</span>
            <span className="text-lg text-muted-foreground line-through">€{Number(deal.original_price).toFixed(2)}</span>
          </div>
        )}

        {deal.description && (
          <p className="text-sm leading-relaxed">{deal.description}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/deal/${deal.id}`);
          }}>
            <Share2 className="mr-1 h-4 w-4" />Delen
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="fine-print" className="border-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Kleine lettertjes</p>
                    <p className="text-xs text-muted-foreground font-normal">Inwisselen, annuleren en voorwaarden</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">📋 Inwisselinstructies</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {deal.redemption_instructions || (
                        deal.counter_discount_mode === "variable_amount" && deal.redemption_method === "at_counter"
                          ? "Toon je voucher aan de kassa. De korting wordt verrekend op het bedrag op jouw kassabon."
                          : "Je ontvangt na claimen een kortingscode. Gebruik deze op de betaalpagina van de aanbieder, of toon je voucher als dat bij deze deal geldt."
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">🚫 Annuleringsbeleid</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {deal.cancellation_policy || "Annuleren en wijzigingen lopen via de aanbieder. Last-minute deals kunnen beperkingen hebben."}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">📜 Algemene voorwaarden</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {deal.terms_summary || "Door deze deal te claimen ga je akkoord met de voorwaarden van Last Ones Left en de aanbieder."}
                    </p>
                    <Link to="/algemene-voorwaarden" className="text-sm text-primary hover:underline font-medium mt-1 inline-block">
                      Lees de algemene voorwaarden →
                    </Link>
                    <br />
                    <Link to="/help" className="text-sm text-primary hover:underline font-medium mt-1 inline-block">
                      Hulp nodig? Bekijk het Helpcenter →
                    </Link>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* No claim CTA - admin preview */}
    </div>
  );
}
