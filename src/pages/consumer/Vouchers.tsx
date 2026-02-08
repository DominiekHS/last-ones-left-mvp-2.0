import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Ticket } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Link, Navigate } from "react-router-dom";

export default function Vouchers() {
  const { user, roles, loading } = useAuth();
  const isMerchant = roles.includes("merchant");

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ["vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*, deals(title, city, start_time, expiry_time, checkout_link, discount_percentage, original_price, merchants(company_name))")
        .eq("user_id", user!.id)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !isMerchant,
  });

  if (!loading && !user) return <Navigate to="/login" />;
  if (!loading && isMerchant) return <Navigate to="/merchant" />;

  return (
    <div className="container py-6 max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-bold">Mijn Vouchers</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : vouchers && vouchers.length > 0 ? (
        <div className="space-y-3">
          {vouchers.map((v) => {
            const deal = v.deals as any;
            const isExpired = deal && new Date(deal.expiry_time) < new Date();
            const discountedPrice = deal ? deal.original_price * (1 - deal.discount_percentage / 100) : 0;

            return (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold">{deal?.title || "Onbekende deal"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {deal?.merchants?.company_name} · {deal?.city}
                      </p>
                    </div>
                    {isExpired ? (
                      <Badge variant="secondary">Verlopen</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">Actief</Badge>
                    )}
                  </div>

                  {deal && (
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

                  {deal?.checkout_link && !isExpired && (
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <a href={deal.checkout_link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-4 w-4" />Naar afrekenen
                      </a>
                    </Button>
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
          <p className="text-muted-foreground">Je hebt nog geen deals geclaimd.</p>
          <Button asChild><Link to="/">Deals bekijken</Link></Button>
        </div>
      )}
    </div>
  );
}
