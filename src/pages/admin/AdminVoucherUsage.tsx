import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { nl } from "date-fns/locale";
import { Download, Ticket, Users, Store, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

export default function AdminVoucherUsage() {
  const { user, roles, loading } = useAuth();

  // Filters
  const [merchantFilter, setMerchantFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState(() =>
    format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [page, setPage] = useState(0);

  // Fetch merchants for dropdown
  const { data: merchants } = useQuery({
    queryKey: ["admin-merchants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, company_name")
        .order("company_name");
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin"),
  });

  // Fetch claim_history with filters
  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ["admin-voucher-usage", merchantFilter, startDate, endDate],
    queryFn: async () => {
      const from = startOfDay(new Date(startDate)).toISOString();
      const to = endOfDay(new Date(endDate)).toISOString();

      let query = supabase
        .from("claim_history")
        .select("*")
        .gte("claimed_at", from)
        .lte("claimed_at", to)
        .order("claimed_at", { ascending: false });

      if (merchantFilter !== "all") {
        // Get deal_ids for this merchant
        const { data: dealIds } = await supabase
          .from("deals")
          .select("id")
          .eq("merchant_id", merchantFilter);
        if (dealIds?.length) {
          query = query.in(
            "deal_id",
            dealIds.map((d) => d.id)
          );
        } else {
          return [];
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with consumer profile info
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return data.map((c) => ({
        ...c,
        consumer_name: profileMap.get(c.user_id)?.full_name || "Onbekend",
        consumer_email: profileMap.get(c.user_id)?.email || "",
      }));
    },
    enabled: roles.includes("admin"),
  });

  // KPIs
  const kpis = useMemo(() => {
    if (!claims) return { total: 0, uniqueConsumers: 0, uniqueMerchants: 0 };
    const consumerSet = new Set(claims.map((c) => c.user_id));
    const merchantSet = new Set(claims.map((c) => c.merchant_name));
    return {
      total: claims.length,
      uniqueConsumers: consumerSet.size,
      uniqueMerchants: merchantSet.size,
    };
  }, [claims]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil((claims?.length || 0) / PAGE_SIZE));
  const pagedClaims = claims?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];

  // Reset page on filter change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(0);
  };

  // CSV Export
  const exportCSV = () => {
    if (!claims?.length) return;
    const headers = [
      "Datum geclaimd",
      "Consument",
      "E-mail",
      "Bedrijf",
      "Deal",
      "Kortingscode",
      "Start activiteit",
    ];
    const rows = claims.map((c) => [
      format(new Date(c.claimed_at), "dd-MM-yyyy HH:mm", { locale: nl }),
      (c as any).consumer_name,
      (c as any).consumer_email,
      c.merchant_name,
      c.title,
      c.discount_code,
      c.start_time
        ? format(new Date(c.start_time), "dd-MM-yyyy HH:mm", { locale: nl })
        : "",
    ]);
    const csv =
      [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kortingscodes_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="font-display text-2xl font-bold">Kortingscodes overzicht</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10 text-primary">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.total}</p>
              <p className="text-xs text-muted-foreground">Totaal geclaimd</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.uniqueConsumers}</p>
              <p className="text-xs text-muted-foreground">Unieke consumenten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full p-2 bg-primary/10 text-primary">
              <Store className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis.uniqueMerchants}</p>
              <p className="text-xs text-muted-foreground">Unieke bedrijven</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label>Bedrijf</Label>
              <Select
                value={merchantFilter}
                onValueChange={(v) => handleFilterChange(setMerchantFilter, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Alle bedrijven" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle bedrijven</SelectItem>
                  {merchants?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Van</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) =>
                  handleFilterChange(setStartDate, e.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Tot</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) =>
                  handleFilterChange(setEndDate, e.target.value)
                }
              />
            </div>
            <Button variant="outline" onClick={exportCSV} disabled={!claims?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum geclaimd</TableHead>
                  <TableHead>Consument</TableHead>
                  <TableHead>Bedrijf</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Kortingscode</TableHead>
                  <TableHead>Start activiteit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Laden...
                    </TableCell>
                  </TableRow>
                ) : pagedClaims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Geen resultaten voor de geselecteerde periode.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedClaims.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(c.claimed_at), "d MMM yyyy HH:mm", {
                          locale: nl,
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{c.consumer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.consumer_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{c.merchant_name}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {c.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {c.discount_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {c.start_time
                          ? format(new Date(c.start_time), "d MMM HH:mm", {
                              locale: nl,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {claims?.length} resultaten · pagina {page + 1} van {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
