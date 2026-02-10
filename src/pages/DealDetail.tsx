import { useParams, Link } from "react-router-dom";
import { useDeal } from "@/hooks/useDeals";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, ArrowLeft, Copy, ExternalLink, Share2, FileText, Pencil, Eye as EyeIcon, MousePointerClick } from "lucide-react";

import { format, formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const { user, merchant, roles } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const isMerchantOwner = merchant && deal && deal.merchant_id === merchant.id;
  const isAdmin = roles.includes("admin");

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
      {isMerchantOwner && (
        <div className="bg-muted/50 border rounded-md px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <EyeIcon className="h-3 w-3" />
          Preview — zo zien consumenten jouw advertentie
        </div>
      )}

      <Button variant="ghost" size="sm" asChild>
        <Link to={isMerchantOwner ? `/merchant/deals/${id}` : "/"}><ArrowLeft className="mr-1 h-4 w-4" />{isMerchantOwner ? "Terug naar advertentiebeheer" : "Terug"}</Link>
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
          {deal.redemption_method === "online_checkout" && <Badge variant="outline">Korting online</Badge>}
          {deal.redemption_method === "at_counter" && <Badge variant="outline">Korting aan de kassa</Badge>}
          {deal.redemption_method === "online_pay_pos_refund" && <Badge variant="outline">Korting terug aan kassa</Badge>}
          {isExpired && <Badge variant="destructive">Verlopen</Badge>}
        </div>

        <h1 className="font-display text-2xl font-bold">{deal.title}</h1>

        {deal.merchants && (
          <p className="text-muted-foreground">
            Aanbieder:{" "}
            <Link
              to={`/bedrijf/${deal.merchant_id}`}
              className="text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
            >
              {(deal.merchants as any).company_name}
            </Link>
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{deal.city}{(deal as any).postal_code ? `, ${(deal as any).postal_code}` : ""}</span>
          <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Start activiteit: {format(startDate, "d MMM HH:mm", { locale: nl })}</span>
          {startDate.getTime() === expiryDate.getTime() ? (
            <span>Advertentie verloopt bij start ({format(expiryDate, "HH:mm", { locale: nl })})</span>
          ) : (
            <span>Advertentie verloopt: {format(expiryDate, "d MMM HH:mm", { locale: nl })} ({formatDistanceToNow(expiryDate, { locale: nl, addSuffix: true })})</span>
          )}
        </div>

        {(deal as any).pricing_model === "per_person_variable" ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-display font-semibold text-sm">Prijs</h3>
              {(deal as any).price_per_person ? (
                <>
                  <p className="text-sm text-muted-foreground">Normale prijs: <span className="font-semibold text-foreground">€{Number((deal as any).price_per_person).toFixed(2)} p.p.</span></p>
                  <p className="text-sm text-muted-foreground">Met korting: <span className="font-semibold text-foreground">€{(Number((deal as any).price_per_person) * (1 - deal.discount_percentage / 100)).toFixed(2)} p.p.</span></p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Je krijgt <span className="font-semibold text-foreground">{deal.discount_percentage}%</span> korting op het totaalbedrag.</p>
              )}
              <p className="text-sm text-muted-foreground">De totaalprijs hangt af van het aantal personen dat je kiest in de checkout.</p>
            </CardContent>
          </Card>
        ) : (deal as any).counter_discount_mode === "variable_amount" && deal.redemption_method === "at_counter" ? (
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

        {/* Hoe werkt het? sectie */}
        {deal.redemption_method === "online_pay_pos_refund" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-display font-semibold text-sm">Hoe werkt het?</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Reserveer en betaal online via de knop "Naar afrekenen".</li>
                <li>Na betaling ga je naar de locatie.</li>
                <li>Laat bij de kassa je Last Ones Left kortingscode zien.</li>
                <li>Je krijgt de korting op locatie terug/verrekend.</li>
              </ol>
              <p className="text-xs text-muted-foreground font-medium mt-2">
                ℹ️ Online zie je geen kortingscode-veld — dat klopt.
              </p>
            </CardContent>
          </Card>
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
                      {(deal as any).redemption_instructions || (
                        (deal as any).counter_discount_mode === "variable_amount" && deal.redemption_method === "at_counter"
                          ? "Toon je voucher aan de kassa. De korting wordt verrekend op het bedrag op jouw kassabon."
                          : "Je ontvangt na claimen een kortingscode. Gebruik deze op de betaalpagina van de aanbieder, of toon je voucher als dat bij deze deal geldt."
                      )}
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

      {isMerchantOwner ? (
        <MerchantPreviewCTA dealId={deal.id} />
      ) : isAdmin ? (
        <p className="text-sm text-muted-foreground italic">Je bekijkt dit als admin. Claim-functionaliteit is uitgeschakeld.</p>
      ) : (
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
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">📍 Toon deze code bij de kassa om je {deal.discount_percentage}% korting te ontvangen.</p>
                    {deal.checkout_link && (
                      <Button asChild variant="outline" className="w-full" onClick={() => {
                        supabase.from("deal_events").insert({ deal_id: deal.id, event_type: "checkout_click", user_id: user?.id || null }).then();
                      }}>
                        <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-4 w-4" />Tickets kopen / Reserveren
                        </a>
                      </Button>
                    )}
                  </div>
                ) : deal.redemption_method === "online_pay_pos_refund" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">📍 Toon deze code bij de kassa om je korting terug te krijgen.</p>
                    <p className="text-xs text-muted-foreground">Je hebt al online betaald; deze code is alleen voor de kassa.</p>
                    {deal.checkout_link && (
                      <Button asChild className="w-full" onClick={() => {
                        supabase.from("deal_events").insert({ deal_id: deal.id, event_type: "checkout_click", user_id: user?.id || null }).then();
                      }}>
                        <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-4 w-4" />Reserveer online
                        </a>
                      </Button>
                    )}
                  </div>
                ) : deal.checkout_link ? (
                  <Button asChild className="w-full" onClick={() => {
                    supabase.from("deal_events").insert({ deal_id: deal.id, event_type: "checkout_click", user_id: user?.id || null }).then();
                  }}>
                    <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-4 w-4" />Naar afrekenen
                    </a>
                  </Button>
                ) : null}
              </>
            ) : isExpired ? (
              <p className="text-sm text-muted-foreground">Deze deal is helaas verlopen.</p>
            ) : (
              <>
                {(deal as any).pricing_model === "per_person_variable" && (
                  <p className="text-xs text-muted-foreground mb-2">In de volgende stap kies je het aantal personen. De prijs wordt daar berekend.</p>
                )}
                <Button onClick={handleClaim} disabled={claiming} className="w-full">
                  {claiming ? "Bezig..." : "Claim korting / Naar afrekenen"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MerchantPreviewCTA({ dealId }: { dealId: string }) {
  const { data: stats } = useQuery({
    queryKey: ["deal-stats", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_events")
        .select("event_type")
        .eq("deal_id", dealId);
      if (error) return { views: 0, clicks: 0 };
      const views = data.filter((e) => e.event_type === "view").length;
      const clicks = data.filter((e) => e.event_type === "click").length;
      return { views, clicks };
    },
  });

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><EyeIcon className="h-4 w-4" />{stats?.views || 0} weergaven</span>
            <span className="flex items-center gap-1"><MousePointerClick className="h-4 w-4" />{stats?.clicks || 0} klikken</span>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button asChild className="flex-1">
          <Link to={`/merchant/ads/${dealId}/edit`}><Pencil className="mr-1 h-4 w-4" />Bewerk advertentie</Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link to={`/merchant/deals/${dealId}`}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar advertentiebeheer</Link>
        </Button>
      </div>
    </>
  );
}
