import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, Store, MapPin, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AdminConsumerDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { user, roles, loading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["admin-consumer-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && roles.includes("admin"),
  });

  const { data: history, isLoading } = useQuery({
    queryKey: ["admin-consumer-history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claim_history")
        .select("*")
        .eq("user_id", userId!)
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && roles.includes("admin"),
  });

  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  const statusLabel = (v: any) => {
    if (v.status === "archived") return "Gearchiveerd";
    if (v.became_inactive_at) return "Inactief";
    const deal = v.deals as any;
    if (deal && new Date(deal.expiry_time) < new Date()) return "Verlopen";
    return "Actief";
  };

  const statusVariant = (v: any): "default" | "secondary" | "outline" => {
    const label = statusLabel(v);
    if (label === "Actief") return "default";
    return "secondary";
  };

  return (
    <div className="container py-6 max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Terug naar Admin
        </Link>
      </Button>

      {profile && (
        <div>
          <h1 className="font-display text-2xl font-bold">{profile.full_name || "Geen naam"}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.email} · Lid sinds {format(new Date(profile.created_at), "d MMM yyyy", { locale: nl })}
          </p>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">
          Kortingscodes geschiedenis ({vouchers?.length || 0})
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : vouchers && vouchers.length > 0 ? (
          <div className="space-y-3">
            {vouchers.map((v) => {
              const deal = v.deals as any;
              return (
                <Card key={v.id}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-semibold">{deal?.title || "Onbekende deal"}</h3>
                        <p className="text-xs text-muted-foreground">
                          {deal?.merchants?.company_name} · {deal?.city}
                        </p>
                      </div>
                      <Badge variant={statusVariant(v)}>{statusLabel(v)}</Badge>
                    </div>

                    <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                      <code className="font-mono font-bold flex-1 text-sm">
                        {v.discount_code === "ARCHIVED" ? "—" : v.discount_code}
                      </code>
                    </div>

                    <div className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      <span>Geclaimd: {format(new Date(v.claimed_at), "d MMM yyyy HH:mm", { locale: nl })}</span>
                      {v.became_inactive_at && (
                        <span>Inactief sinds: {format(new Date(v.became_inactive_at), "d MMM yyyy HH:mm", { locale: nl })}</span>
                      )}
                      {v.archived_at && (
                        <span>Gearchiveerd: {format(new Date(v.archived_at), "d MMM yyyy HH:mm", { locale: nl })}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Deze consument heeft nog geen kortingscodes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
