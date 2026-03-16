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
          Claimgeschiedenis ({history?.length || 0})
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground">Laden...</p>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="p-4 space-y-1.5">
                  <h3 className="font-display font-semibold">{h.title || "Onbekende deal"}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Store className="h-3.5 w-3.5" />
                      {h.merchant_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {h.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Geclaimd: {format(new Date(h.claimed_at), "d MMM yyyy · HH:mm", { locale: nl })}
                    </span>
                  </div>
                  {h.discount_code && h.discount_code !== "ARCHIVED" && (
                    <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                      <code className="font-mono font-bold text-sm">{h.discount_code}</code>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Deze consument heeft nog geen claims.</p>
          </div>
        )}
      </div>
    </div>
  );
}
