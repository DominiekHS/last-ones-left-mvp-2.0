import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Ban, CheckCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export default function AdminDashboard() {
  const { user, roles, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: merchants } = useQuery({
    queryKey: ["admin-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("merchants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin"),
  });

  const { data: deals } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*, merchants(company_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin"),
  });

  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  const toggleBlock = async (merchantId: string, currentlyBlocked: boolean) => {
    const { error } = await supabase
      .from("merchants")
      .update({ blocked: !currentlyBlocked })
      .eq("id", merchantId);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
      toast({ title: currentlyBlocked ? "Merchant gedeblokkeerd" : "Merchant geblokkeerd" });
    }
  };

  const deleteDeal = async (dealId: string) => {
    if (!confirm("Deal verwijderen?")) return;
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast({ title: "Deal verwijderd" });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-display text-2xl font-bold">Admin Panel</h1>

      <Tabs defaultValue="merchants">
        <TabsList>
          <TabsTrigger value="merchants">Ondernemers ({merchants?.length || 0})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="merchants" className="space-y-3 mt-4">
          {merchants?.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold">{m.company_name}</h3>
                  <p className="text-xs text-muted-foreground">{m.city} · {m.venue_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.blocked && <Badge variant="destructive">Geblokkeerd</Badge>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleBlock(m.id, m.blocked)}
                  >
                    {m.blocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="deals" className="space-y-3 mt-4">
          {deals?.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-semibold">{d.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {(d.merchants as any)?.company_name} · {d.city} ·{" "}
                    {format(new Date(d.start_time), "d MMM HH:mm", { locale: nl })}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => deleteDeal(d.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
