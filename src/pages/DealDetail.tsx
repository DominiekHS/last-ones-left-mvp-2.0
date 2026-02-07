import { useParams, Link } from "react-router-dom";
import { useDeal } from "@/hooks/useDeals";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, ArrowLeft, Copy, ExternalLink, Share2, FileText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading } = useDeal(id!);
  const { user } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Track view
  useEffect(() => {
    if (id) {
      supabase.from("deal_events").insert({ deal_id: id, event_type: "view", user_id: user?.id || null }).then();
    }
  }, [id, user]);

  // Check if already claimed
  useEffect(() => {
    if (user && id) {
      supabase
        .from("vouchers")
        .select("discount_code")
        .eq("user_id", user.id)
        .eq("deal_id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setClaimed(true);
            setClaimedCode(data.discount_code);
          }
        });
    }
  }, [user, id]);

  const handleClaim = async () => {
    if (!user || !deal) return;
    setClaiming(true);
    const { error } = await supabase.from("vouchers").insert({
      user_id: user.id,
      deal_id: deal.id,
      discount_code: deal.discount_code,
    });
    if (error) {
      toast({ title: "Fout", description: "Kon de deal niet claimen. Probeer opnieuw.", variant: "destructive" });
    } else {
      setClaimed(true);
      setClaimedCode(deal.discount_code);
      toast({ title: "Gelukt!", description: "Je kortingscode is opgeslagen." });
      // Track click
      supabase.from("deal_events").insert({ deal_id: deal.id, event_type: "click", user_id: user.id }).then();
    }
    setClaiming(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link gekopieerd!", description: "Deel deze deal met je vrienden." });
  };

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
      <div className="container py-16 text-center">
        <h2 className="font-display text-xl font-semibold">Deal niet gevonden</h2>
        <Button variant="link" asChild className="mt-4">
          <Link to="/">Terug naar deals</Link>
        </Button>
      </div>
    );
  }

  const discountedPrice = deal.original_price * (1 - deal.discount_percentage / 100);
  const startDate = new Date(deal.start_time);
  const expiryDate = new Date(deal.expiry_time);
  const isExpired = expiryDate < new Date();

  return (
    <div className="container py-4 max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Terug</Link>
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
          <p className="text-muted-foreground">{(deal.merchants as any).company_name}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{deal.city}</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Start: {format(startDate, "d MMM HH:mm", { locale: nl })}</span>
          <span>Verloopt {formatDistanceToNow(expiryDate, { locale: nl, addSuffix: true })}</span>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-bold">€{discountedPrice.toFixed(2)}</span>
          <span className="text-lg text-muted-foreground line-through">€{Number(deal.original_price).toFixed(2)}</span>
        </div>

        {deal.description && (
          <p className="text-sm leading-relaxed">{deal.description}</p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1 h-4 w-4" />Delen
          </Button>
        </div>
      </div>

      {/* Kleine lettertjes */}
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
                      {(deal as any).redemption_instructions || "Je ontvangt na claimen een kortingscode. Gebruik deze op de betaalpagina van de aanbieder, of toon je voucher als dat bij deze deal geldt."}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">🚫 Annuleringsbeleid</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {(deal as any).cancellation_policy || "Annuleren en wijzigingen lopen via de aanbieder. Last-minute deals kunnen beperkingen hebben."}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">📜 Algemene voorwaarden</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {(deal as any).terms_summary || "Door deze deal te claimen ga je akkoord met de voorwaarden van Last Ones Left en de aanbieder."}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          {!user ? (
            <>
              <p className="text-sm text-muted-foreground">Log in om deze deal te claimen</p>
              <Button asChild className="w-full">
                <Link to="/registreren">Account aanmaken (± 1 minuut)</Link>
              </Button>
            </>
          ) : claimed ? (
            <>
              <p className="text-sm font-semibold text-success">✅ Deal geclaimd!</p>
              <div className="flex items-center gap-2 bg-muted p-3 rounded-md">
                <code className="font-mono font-bold text-lg flex-1">{claimedCode}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(claimedCode || "");
                    toast({ title: "Gekopieerd!" });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {deal.redemption_method === "at_counter" ? (
                <p className="text-sm text-muted-foreground">📍 Toon deze code bij de kassa om je korting te ontvangen.</p>
              ) : deal.checkout_link ? (
                <Button asChild className="w-full">
                  <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-4 w-4" />Naar afrekenen
                  </a>
                </Button>
              ) : null}
            </>
          ) : isExpired ? (
            <p className="text-sm text-muted-foreground">Deze deal is helaas verlopen.</p>
          ) : (
            <Button onClick={handleClaim} disabled={claiming} className="w-full">
              {claiming ? "Bezig..." : "Claim korting / Naar afrekenen"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
