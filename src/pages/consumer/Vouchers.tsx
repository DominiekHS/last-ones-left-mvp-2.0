import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, ExternalLink, Ticket } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Link, Navigate } from "react-router-dom";
import { useState } from "react";

export default function Vouchers() {
  const { user, roles, loading } = useAuth();
  const isMerchant = roles.includes("merchant");
  const [showInactive, setShowInactive] = useState(false);

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ["vouchers", user?.id, showInactive],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*, deals(title, city, start_time, expiry_time, checkout_link, discount_percentage, original_price, redemption_method, merchants(company_name))")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !isMerchant,
  });

  if (!loading && !user) return <Navigate to="/login" />;
  if (!loading && isMerchant) return <Navigate to="/merchant" />;

  const now = new Date();
  const activeVouchers = vouchers?.filter((v) => {
    const deal = v.deals as any;
    return deal && new Date(deal.expiry_time) >= now && !v.became_inactive_at;
  }) || [];

  const inactiveVouchers = vouchers?.filter((v) => {
    const deal = v.deals as any;
    const isExpired = !deal || new Date(deal.expiry_time) < now;
    return isExpired || !!v.became_inactive_at;
  }) || [];

  const displayVouchers = showInactive
    ? [...activeVouchers, ...inactiveVouchers]
    : activeVouchers;

  return (
    <div className="container py-6 max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-bold">Mijn Vouchers</h1>

      <div className="flex items-center gap-2">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
        <Label htmlFor="show-inactive" className="text-sm text-muted-foreground cursor-pointer">
          Toon ook inactieve vouchers (laatste 24 uur)
        </Label>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : displayVouchers.length > 0 ? (
        <div className="space-y-3">
          {displayVouchers.map((v) => {
            const deal = v.deals as any;
            const isActive = deal && new Date(deal.expiry_time) >= now && !v.became_inactive_at;
            const discountedPrice = deal ? deal.original_price * (1 - deal.discount_percentage / 100) : 0;

            return (
              <Card key={v.id} className={!isActive ? "opacity-60" : ""}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold">{deal?.title || "Onbekende deal"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {deal?.merchants?.company_name} · {deal?.city}
                      </p>
                    </div>
                    {isActive ? (
                      <Badge className="bg-success text-success-foreground">Actief</Badge>
                    ) : (
                      <Badge variant="secondary">Inactief</Badge>
                    )}
                  </div>

                  {deal && deal.original_price > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Start: {format(new Date(deal.start_time), "d MMM HH:mm", { locale: nl })} ·{" "}
                      €{discountedPrice.toFixed(2)}
                    </p>
                  )}

                  <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <code className="font-mono font-bold flex-1">{v.discount_code}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(v.discount_code);
                        toast({ title: "Gekopieerd!" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Method-specific instructions */}
                  {deal?.redemption_method === "online_pay_pos_refund" && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p className="font-medium">📍 Toon bij de kassa voor terugbetaling/verrekening van korting.</p>
                      <p>Je hebt al online betaald; deze code is alleen voor de kassa.</p>
                    </div>
                  )}
                  {deal?.redemption_method === "at_counter" && (
                    <p className="text-xs text-muted-foreground">📍 Toon deze code bij de kassa.</p>
                  )}

                  {deal?.checkout_link && isActive && (
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-4 w-4" />
                        {deal?.redemption_method === "online_pay_pos_refund" ? "Reserveer online" : "Naar afrekenen"}
                      </a>
                    </Button>
                  )}

                  {!isActive && (
                    <p className="text-xs text-muted-foreground italic">
                      Verdwijnt automatisch binnen 24 uur.
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Geclaimd: {format(new Date(v.claimed_at), "d MMM yyyy HH:mm", { locale: nl })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 space-y-3">
          <Ticket className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            {showInactive
              ? "Je hebt geen vouchers."
              : "Je hebt momenteel geen actieve vouchers."}
          </p>
          <Button asChild><Link to="/">Deals bekijken</Link></Button>
        </div>
      )}
    </div>
  );
}
