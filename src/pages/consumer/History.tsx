import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Store } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link, Navigate } from "react-router-dom";

export default function History() {
  const { user, roles, loading } = useAuth();
  const isMerchant = roles.includes("merchant");

  const { data: activities, isLoading } = useQuery({
    queryKey: ["consumer-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claim_history")
        .select("deal_id, title, merchant_name, city, start_time, claimed_at")
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
      <div>
        <h1 className="font-display text-2xl font-bold">Geschiedenis</h1>
        <p className="text-sm text-muted-foreground">
          Hier zie je eerdere activiteiten die je via Last Ones Left hebt geclaimd.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : activities && activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((a) => (
            <Card key={a.deal_id + a.claimed_at}>
              <CardContent className="p-4 space-y-1.5">
                <h3 className="font-display font-semibold">{a.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" />
                    {a.merchant_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {a.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Geclaimd: {format(new Date(a.claimed_at!), "d MMM yyyy · HH:mm", { locale: nl })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 space-y-3">
          <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Nog geen geschiedenis. Claim een deal om hier je activiteiten terug te zien.
          </p>
          <Button asChild><Link to="/">Deals bekijken</Link></Button>
        </div>
      )}
    </div>
  );
}
