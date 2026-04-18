import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Ban, CheckCircle, Trash2, Store, Tag, Users, Search, ChevronRight, ShieldAlert, Ticket, CalendarDays, MapPin, Inbox, Settings } from "lucide-react";
import { ActivityRequestsTab } from "@/components/admin/ActivityRequestsTab";
import { PlatformSettingsTab } from "@/components/admin/PlatformSettingsTab";
import { EnvironmentStatusTab } from "@/components/admin/EnvironmentStatusTab";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
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

  // Consumer date filter
  const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const [consumerStartDate, setConsumerStartDate] = useState(defaultStart);
  const [consumerEndDate, setConsumerEndDate] = useState(defaultEnd);
  
  

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
      const { data: consumerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "consumer");
      if (rolesError) throw rolesError;
      if (!consumerRoles?.length) return [];
      const userIds = consumerRoles.map((r) => r.user_id);
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

  // Fetch all claim history for consumer stats (admin-only via RLS)
  const { data: allClaims } = useQuery({
    queryKey: ["admin-all-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claim_history")
        .select("*")
        .order("claimed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: roles.includes("admin"),
  });

  // Derived: filtered consumers + claim stats
  const consumerStats = useMemo(() => {
    if (!consumers || !allClaims) return { filtered: [], newCount: 0, totalClaims: 0, avgClaims: 0 };

    const start = startOfDay(new Date(consumerStartDate));
    const end = endOfDay(new Date(consumerEndDate));

    // Filter consumers by created_at in period
    const filtered = consumers.filter((c) => {
      const created = new Date(c.created_at);
      return created >= start && created <= end;
    });

    const filteredUserIds = new Set(filtered.map((c) => c.user_id));

    // Count claims that happened within the date range (all consumers)
    let totalClaims = 0;
    const claimsMap = new Map<string, { count: number; lastClaimed: string | null }>();
    for (const claim of allClaims) {
      const claimedAt = new Date(claim.claimed_at);
      if (claimedAt < start || claimedAt > end) continue;
      totalClaims++;
      // Only track per-consumer stats for filtered consumers (for the list)
      if (!filteredUserIds.has(claim.user_id)) continue;
      const existing = claimsMap.get(claim.user_id);
      if (existing) {
        existing.count++;
        if (!existing.lastClaimed || claim.claimed_at > existing.lastClaimed) {
          existing.lastClaimed = claim.claimed_at;
        }
      } else {
        claimsMap.set(claim.user_id, { count: 1, lastClaimed: claim.claimed_at });
      }
    }

    // Add claim stats to filtered consumers, then apply search
    const enriched = filtered.map((c) => ({
      ...c,
      claimsCount: claimsMap.get(c.user_id)?.count || 0,
      lastClaimedAt: claimsMap.get(c.user_id)?.lastClaimed || null,
    }));

    return {
      filtered: enriched,
      newCount: filtered.length,
      totalClaims,
      avgClaims: filtered.length > 0 ? Math.round((totalClaims / filtered.length) * 10) / 10 : 0,
    };
  }, [consumers, allClaims, consumerStartDate, consumerEndDate]);

  // Build enriched list for "all" mode too (with claim stats for all consumers)
  const allConsumersEnriched = useMemo(() => {
    if (!consumers || !allClaims) return [];
    const claimsMap = new Map<string, { count: number; lastClaimed: string | null }>();
    for (const claim of allClaims) {
      const existing = claimsMap.get(claim.user_id);
      if (existing) {
        existing.count++;
        if (!existing.lastClaimed || claim.claimed_at > existing.lastClaimed) existing.lastClaimed = claim.claimed_at;
      } else {
        claimsMap.set(claim.user_id, { count: 1, lastClaimed: claim.claimed_at });
      }
    }
    return consumers.map((c) => ({
      ...c,
      claimsCount: claimsMap.get(c.user_id)?.count || 0,
      lastClaimedAt: claimsMap.get(c.user_id)?.lastClaimed || null,
    }));
  }, [consumers, allClaims]);

  const [consumerListMode, setConsumerListMode] = useState<"all" | "new" | "claims">("all");
  const displayedConsumers = consumerListMode === "new" ? consumerStats.filtered : allConsumersEnriched;

  const searchedConsumers = displayedConsumers.filter((c) =>
    c.full_name.toLowerCase().includes(consumerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(consumerSearch.toLowerCase())
  );

  // Claims filtered by period for the claims list view
  const filteredClaims = useMemo(() => {
    if (!allClaims) return [];
    const start = startOfDay(new Date(consumerStartDate));
    const end = endOfDay(new Date(consumerEndDate));
    return allClaims.filter((c) => {
      const claimedAt = new Date(c.claimed_at);
      return claimedAt >= start && claimedAt <= end;
    });
  }, [allClaims, consumerStartDate, consumerEndDate]);

  // Build a lookup of consumer names
  const consumerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    consumers?.forEach((c) => map.set(c.user_id, c.full_name || c.email));
    return map;
  }, [consumers]);

  const { data: deals } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*, merchants(company_name)")
        .is("deleted_at", null)
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
    // Soft-delete: rij blijft fysiek bestaan, herstel mogelijk via DB.
    const { error } = await supabase
      .from("deals")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", dealId);
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
          <TabsTrigger value="vouchers" onClick={() => navigate("/admin/kortingscodes")}>Kortingscodes</TabsTrigger>
          <TabsTrigger value="requests" className="gap-1"><Inbox className="h-3 w-3" />Voorkeuren</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1"><Settings className="h-3 w-3" />Instellingen</TabsTrigger>
          <TabsTrigger value="system" className="gap-1"><ShieldAlert className="h-3 w-3" />Systeem</TabsTrigger>
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

        <TabsContent value="consumers" className="space-y-4 mt-4">
          {/* Date range filter */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Startdatum</Label>
                  <Input
                    type="date"
                    value={consumerStartDate}
                    onChange={(e) => setConsumerStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Einddatum</Label>
                  <Input
                    type="date"
                    value={consumerEndDate}
                    onChange={(e) => setConsumerEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI cards — clickable to toggle list */}
          <div className="grid grid-cols-3 gap-3">
            <Card
              className={`cursor-pointer transition-colors ${consumerListMode === "all" ? "ring-2 ring-primary" : "hover:bg-accent/50"}`}
              onClick={() => setConsumerListMode("all")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full p-2 bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold">{consumers?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Totaal consumenten</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-colors ${consumerListMode === "new" ? "ring-2 ring-primary" : "hover:bg-accent/50"}`}
              onClick={() => setConsumerListMode("new")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full p-2 bg-primary/10 text-primary"><Users className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold">{consumerStats.newCount}</p>
                  <p className="text-xs text-muted-foreground">Nieuwe consumenten</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-colors ${consumerListMode === "claims" ? "ring-2 ring-primary" : "hover:bg-accent/50"}`}
              onClick={() => setConsumerListMode("claims")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-full p-2 bg-primary/10 text-primary"><Ticket className="h-4 w-4" /></div>
                <div>
                  <p className="text-2xl font-bold">{consumerStats.totalClaims}</p>
                  <p className="text-xs text-muted-foreground">Geclaimde codes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {consumerListMode !== "claims" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of e-mail..."
                  value={consumerSearch}
                  onChange={(e) => setConsumerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {searchedConsumers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {consumerListMode === "new" ? "Geen nieuwe consumenten gevonden in deze periode." : "Geen consumenten gevonden."}
                </p>
              )}
              {searchedConsumers.map((c) => (
                <Card key={c.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/admin/consumenten/${c.user_id}`)}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold">{c.full_name || "Geen naam"}</h3>
                        {c.claimsCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Ticket className="h-3 w-3 mr-1" />
                            {c.claimsCount} claims
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.email} · Aangemaakt: {format(new Date(c.created_at), "d MMM yyyy", { locale: nl })}
                        {c.lastClaimedAt && (
                          <> · Laatste claim: {format(new Date(c.lastClaimedAt), "d MMM yyyy HH:mm", { locale: nl })}</>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {consumerListMode === "claims" && (
            <>
              {filteredClaims.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Geen geclaimde codes gevonden in deze periode.</p>
              ) : (
                <div className="space-y-3">
                  {filteredClaims.map((h) => (
                    <Card key={h.id}>
                      <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-semibold">{h.title || "Onbekende deal"}</h3>
                          {h.discount_code && h.discount_code !== "ARCHIVED" && (
                            <Badge variant="outline" className="font-mono text-xs">{h.discount_code}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {consumerNameMap.get(h.user_id) || "Onbekend"}
                          </span>
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
                            {format(new Date(h.claimed_at), "d MMM yyyy · HH:mm", { locale: nl })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
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

        <TabsContent value="requests" className="space-y-3 mt-4">
          <ActivityRequestsTab />
        </TabsContent>

        <TabsContent value="settings">
          <PlatformSettingsTab />
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <EnvironmentStatusTab />
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
