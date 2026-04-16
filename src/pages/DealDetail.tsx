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
import PaymentStepsDisplay from "@/components/deals/PaymentStepsDisplay";

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading } = useDeal(id!);
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const [claimed, setClaimed] = useState(false);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const isMerchantOwner = merchant && deal && deal.merchant_id === merchant.id;
  const isAdmin = roles.includes("admin");
  const isConsumer = roles.includes("consumer") && !isAdmin && !merchant;

  // Track view (skip if merchant is viewing their own deal)
  useEffect(() => {
    if (id && !isMerchantOwner) {
      supabase.from("deal_events").insert({ deal_id: id, event_type: "view", user_id: user?.id || null }).then();
    }
  }, [id, user, isMerchantOwner]);

  // Check if already claimed (only for consumers)
  useEffect(() => {
    if (user && id && isConsumer) {
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
  }, [user, id, isConsumer]);

  const handleClaim = async () => {
    if (!user || !deal || !isConsumer) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_deal", {
      p_user_id: user.id,
      p_deal_id: deal.id,
    });
    if (error) {
      const msg = error.message?.includes("No codes available")
        ? "Er zijn geen kortingscodes meer beschikbaar voor deze deal."
        : error.message?.includes("already claimed")
        ? "Je hebt deze deal al geclaimd."
        : "Kon de deal niet claimen. Probeer opnieuw.";
      toast({ title: "Fout", description: msg, variant: "destructive" });
    } else {
      const result = data?.[0];
      setClaimed(true);
      setClaimedCode(result?.discount_code || deal.discount_code);
      toast({ title: "Gelukt!", description: "Je kortingscode is opgeslagen." });
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
  const hasFixedStart = (deal as any).start_time_mode !== "flexible" && deal.start_time;
  const startDate = hasFixedStart ? new Date(deal.start_time) : null;
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
          <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[deal.address, deal.city, (deal as any).postal_code].filter(Boolean).join(", ")}</span>
          {hasFixedStart && startDate ? (
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Start activiteit: {format(startDate, "d MMM HH:mm", { locale: nl })}</span>
          ) : (deal as any).start_time_mode === "flexible" ? (
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />Starttijd: kies je op de reserveringspagina</span>
          ) : null}
          <span>Advertentie verloopt: {format(expiryDate, "d MMM HH:mm", { locale: nl })} ({formatDistanceToNow(expiryDate, { locale: nl, addSuffix: true })})</span>
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

        {/* Verzilvermethode */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-1">
            <h3 className="font-display font-semibold text-sm">Hoe wordt de korting verzilverd?</h3>
            {deal.redemption_method === "online_checkout" && (
              <>
                <p className="text-sm font-medium">Online afrekenen met kortingscode</p>
                <p className="text-xs text-muted-foreground">Gebruik de kortingscode op de betaalpagina van de aanbieder om direct online korting te krijgen.</p>
              </>
            )}
            {deal.redemption_method === "at_counter" && (
              <>
                <p className="text-sm font-medium">Online reserveren - afrekenen op locatie - korting aan kassa terug</p>
                <p className="text-xs text-muted-foreground">Klant hoeft online niet te betalen, maar betaalt pas op locatie. Op locatie toon je de kortingscode en krijg je de korting terug/verrekend.</p>
              </>
            )}
            {deal.redemption_method === "online_pay_pos_refund" && (
              <>
                <p className="text-sm font-medium">Online afrekenen zonder kortingscode, korting aan kassa terug</p>
                <p className="text-xs text-muted-foreground">Betaal het volledige bedrag online. Op locatie toon je de kortingscode en krijg je de korting terug/verrekend.</p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-1 h-4 w-4" />Delen
          </Button>
        </div>
      </div>

      {/* Stappenplan betalen */}
      {(deal as any).payment_steps && Array.isArray((deal as any).payment_steps) && (deal as any).payment_steps.length > 0 && (
        <PaymentStepsDisplay steps={(deal as any).payment_steps} />
      )}

      {/* Kleine lettertjes */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Kleine lettertjes</p>
              <p className="text-xs text-muted-foreground">Inwisselen, annuleren en voorwaarden</p>
            </div>
          </div>
          <div className="space-y-4">
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
        </CardContent>
      </Card>

      {isMerchantOwner ? (
        <MerchantPreviewCTA dealId={deal.id} />
      ) : authLoading ? (
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ) : !user ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Korting claimen en reserveren?</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base py-5">
              <Link to={`/registreren?redirect=/deal/${deal.id}`}>Account aanmaken (± 1 minuut)</Link>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Al een account?{" "}
              <Link to={`/inloggen?redirect=/deal/${deal.id}`} className="underline text-foreground">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : !isConsumer ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground italic">
              {isAdmin
                ? "Je bekijkt dit als admin. Claim-functionaliteit is uitgeschakeld."
                : "Je bekijkt deze deal als ondernemer. Alleen consumenten kunnen korting claimen."}
            </p>
          </CardContent>
        </Card>
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
  const { data: deal } = useDeal(dealId);
  const isExpired = deal ? new Date(deal.expiry_time) < new Date() : false;

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
        {isExpired ? (
          <Button asChild className="flex-1">
            <Link to={`/merchant/ads/new?copyFrom=${dealId}`}><Copy className="mr-1 h-4 w-4" />Kopieer advertentie</Link>
          </Button>
        ) : (
          <Button asChild className="flex-1">
            <Link to={`/merchant/ads/${dealId}/edit`}><Pencil className="mr-1 h-4 w-4" />Bewerk advertentie</Link>
          </Button>
        )}
        <Button variant="outline" asChild className="flex-1">
          <Link to={`/merchant/deals/${dealId}`}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar advertentiebeheer</Link>
        </Button>
      </div>
    </>
  );
}
