import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Ban, CheckCircle, Trash2, Store, Tag, Users, Search, ChevronRight, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CATEGORY_LABELS } from "@/lib/constants";
import { getMerchantEffectiveStatus, STATUS_LABELS, STATUS_VARIANTS } from "@/lib/merchant-status";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { user, roles, loading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [merchantSearch, setMerchantSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [consumerSearch, setConsumerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "blocked">("all");
  const [dealStatusFilter, setDealStatusFilter] = useState<"all" | "active" | "expired">("all");

  const { data: merchants } = useQuery({
    queryKey: ["admin-merchants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin"),
  });

  const { data: consumers } = useQuery({
    queryKey: ["admin-consumers"],
    queryFn: async () => {
      // Get consumer user_ids
      const { data: consumerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "consumer");
      if (rolesError) throw rolesError;
      if (!consumerRoles?.length) return [];
      const userIds = consumerRoles.map((r) => r.user_id);
      // Get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: roles.includes("admin"),
  });

  const { data: deals } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, merchants(company_name)")
        .order("created_at", { ascending: false });
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
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast({ title: currentlyBlocked ? "Merchant gedeblokkeerd" : "Merchant geblokkeerd" });
    }
  };

  const deleteDeal = async (dealId: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", dealId);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
      toast({ title: "Deal verwijderd" });
    }
  };

  const activeDeals = deals?.filter((d) => new Date(d.expiry_time) > new Date()).length || 0;
  const blockedMerchants = merchants?.filter((m) => getMerchantEffectiveStatus(m as any) === "blocked").length || 0;
  const suspendedMerchants = merchants?.filter((m) => getMerchantEffectiveStatus(m as any) === "suspended").length || 0;

  const filteredMerchants = merchants?.filter((m) => {
    const effectiveStatus = getMerchantEffectiveStatus(m as any);
    if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
    return m.company_name.toLowerCase().includes(merchantSearch.toLowerCase()) ||
      m.city.toLowerCase().includes(merchantSearch.toLowerCase());
  });

  const filteredDeals = deals?.filter((d) => {
    const isExpired = new Date(d.expiry_time) < new Date();
    if (dealStatusFilter === "active" && isExpired) return false;
    if (dealStatusFilter === "expired" && !isExpired) return false;
    return d.title.toLowerCase().includes(dealSearch.toLowerCase()) ||
      d.city.toLowerCase().includes(dealSearch.toLowerCase()) ||
      (d.merchants as any)?.company_name?.toLowerCase().includes(dealSearch.toLowerCase());
  });

  const activeDealsCount = deals?.filter((d) => new Date(d.expiry_time) > new Date()).length || 0;
  const expiredDealsCount = (deals?.length || 0) - activeDealsCount;

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-display text-2xl font-bold">Admin Panel</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard icon={<Store className="h-4 w-4" />} label="Ondernemers" value={merchants?.length || 0} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Consumenten" value={consumers?.length ?? 0} />
        <StatCard icon={<ShieldAlert className="h-4 w-4" />} label="Geschorst" value={suspendedMerchants} variant="warning" />
        <StatCard icon={<Ban className="h-4 w-4" />} label="Geblokkeerd" value={blockedMerchants} variant="destructive" />
        <StatCard icon={<Tag className="h-4 w-4" />} label="Actieve deals" value={activeDeals} variant="success" />
      </div>

      <Tabs defaultValue="merchants">
        <TabsList>
          <TabsTrigger value="merchants">Ondernemers ({merchants?.length || 0})</TabsTrigger>
          <TabsTrigger value="consumers">Consumenten ({consumers?.length || 0})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="merchants" className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            {(["all", "active", "suspended", "blocked"] as const).map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "Alle" : STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of stad..."
              value={merchantSearch}
              onChange={(e) => setMerchantSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredMerchants?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Geen ondernemers gevonden.</p>
          )}
          {filteredMerchants?.map((m) => {
            const es = getMerchantEffectiveStatus(m as any);
            return (
              <Card key={m.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/admin/ondernemers/${m.id}`)}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold">{m.company_name}</h3>
                      <Badge variant={STATUS_VARIANTS[es]} className="text-xs">{STATUS_LABELS[es]}</Badge>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[m.venue_type] || m.venue_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.city} · {m.address} · Lid sinds {format(new Date(m.created_at), "d MMM yyyy", { locale: nl })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="consumers" className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam of e-mail..."
              value={consumerSearch}
              onChange={(e) => setConsumerSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {consumers?.filter((c) =>
            c.full_name.toLowerCase().includes(consumerSearch.toLowerCase()) ||
            c.email.toLowerCase().includes(consumerSearch.toLowerCase())
          ).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Geen consumenten gevonden.</p>
          )}
          {consumers
            ?.filter((c) =>
              c.full_name.toLowerCase().includes(consumerSearch.toLowerCase()) ||
              c.email.toLowerCase().includes(consumerSearch.toLowerCase())
            )
            .map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-display font-semibold">{c.full_name || "Geen naam"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {c.email} · Lid sinds {format(new Date(c.created_at), "d MMM yyyy", { locale: nl })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="deals" className="space-y-3 mt-4">
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "all" as const, label: `Alles (${deals?.length || 0})` },
              { key: "active" as const, label: `Actief (${activeDealsCount})` },
              { key: "expired" as const, label: `Verlopen (${expiredDealsCount})` },
            ]).map(s => (
              <Button
                key={s.key}
                variant={dealStatusFilter === s.key ? "default" : "outline"}
                size="sm"
                onClick={() => setDealStatusFilter(s.key)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op titel, stad of ondernemer..."
              value={dealSearch}
              onChange={(e) => setDealSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredDeals?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Geen deals gevonden.</p>
          )}
          {filteredDeals?.map((d) => {
            const isExpired = new Date(d.expiry_time) < new Date();
            return (
              <Card key={d.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/admin/deals/${d.id}`)}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-semibold">{d.title}</h3>
                      <Badge variant={isExpired ? "secondary" : "default"} className="text-xs">
                        {isExpired ? "Verlopen" : "Actief"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[d.category]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(d.merchants as any)?.company_name} · {d.city} · -{d.discount_percentage}% ·{" "}
                      {format(new Date(d.start_time), "d MMM HH:mm", { locale: nl })} -{" "}
                      {format(new Date(d.expiry_time), "d MMM HH:mm", { locale: nl })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="mr-1 h-4 w-4" />Verwijder
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deal verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je "{d.title}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteDeal(d.id)}>
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, variant }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: "destructive" | "success" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-full p-2 ${
          variant === "destructive" ? "bg-destructive/10 text-destructive" :
          variant === "success" ? "bg-green-500/10 text-green-600" :
          variant === "warning" ? "bg-yellow-500/10 text-yellow-600" :
          "bg-primary/10 text-primary"
        }`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
