import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import { MapPin, Clock } from "lucide-react";
import { formatDistanceToNow, format, isToday, differenceInHours } from "date-fns";
import { nl } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Deal = Tables<"deals"> & { merchants?: { company_name: string } | null };

export function DealCard({ deal }: { deal: Deal }) {
  const discountedPrice = deal.original_price * (1 - deal.discount_percentage / 100);
  const startDate = new Date(deal.start_time);
  const expiryDate = new Date(deal.expiry_time);
  const hoursLeft = differenceInHours(expiryDate, new Date());
  const startsToday = isToday(startDate);

  return (
    <Link to={`/deal/${deal.id}`} className="block group">
      <Card className="overflow-hidden border hover:shadow-md transition-shadow h-full">
        <div className="relative aspect-[16/10] bg-muted overflow-hidden">
          {deal.image_url ? (
            <img
              src={deal.image_url}
              alt={deal.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Geen afbeelding
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            <Badge className="bg-primary text-primary-foreground font-bold text-xs">
              -{deal.discount_percentage}%
            </Badge>
            {startsToday && (
              <Badge variant="secondary" className="text-xs font-semibold">
                Vandaag
              </Badge>
            )}
            {hoursLeft <= 3 && hoursLeft > 0 && (
              <Badge variant="destructive" className="text-xs font-semibold">
                Laatste kans!
              </Badge>
            )}
            {deal.redemption_method === "online_checkout" && (
              <Badge variant="outline" className="bg-card/90 text-xs font-semibold">Korting online</Badge>
            )}
            {deal.redemption_method === "at_counter" && (
              <Badge variant="outline" className="bg-card/90 text-xs font-semibold">Korting aan de kassa</Badge>
            )}
            {deal.redemption_method === "online_pay_pos_refund" && (
              <Badge variant="outline" className="bg-card/90 text-xs font-semibold">Korting terug aan kassa</Badge>
            )}
          </div>
          <Badge variant="outline" className="absolute top-2 right-2 bg-card/90 text-xs">
            {CATEGORY_LABELS[deal.category] || deal.category}
          </Badge>
        </div>
        <CardContent className="p-3 space-y-1.5">
          <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary-foreground">
            {deal.title}
          </h3>
          {deal.merchants?.company_name && (
            <Link
              to={`/bedrijf/${deal.merchant_id}`}
              className="text-xs text-muted-foreground hover:text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {deal.merchants.company_name}
            </Link>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{deal.city}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Start: {format(startDate, "HH:mm", { locale: nl })}</span>
            <span className="flex items-center gap-1 text-muted-foreground/70">Verloopt: {format(expiryDate, "HH:mm", { locale: nl })}</span>
          </div>
          {(deal as any).pricing_model === "per_person_variable" ? (
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2 flex-wrap">
                {(deal as any).price_per_person ? (
                  <>
                    <span className="font-display font-bold text-lg">
                      €{(Number((deal as any).price_per_person) * (1 - deal.discount_percentage / 100)).toFixed(2)} p.p.
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      €{Number((deal as any).price_per_person).toFixed(2)} p.p.
                    </span>
                  </>
                ) : (
                  <span className="font-display font-bold text-lg">
                    {deal.discount_percentage}% korting
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Prijs afhankelijk van aantal personen</span>
            </div>
          ) : (deal as any).counter_discount_mode === "variable_amount" && deal.redemption_method === "at_counter" ? (
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-lg">
                {deal.discount_percentage}% korting
              </span>
              <span className="text-xs text-muted-foreground">aan de kassa</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-lg">
                €{discountedPrice.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                €{Number(deal.original_price).toFixed(2)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
