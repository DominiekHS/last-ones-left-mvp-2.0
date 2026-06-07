import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Trophy } from "lucide-react";

type LeaderboardRow = {
  referrer_user_id: string;
  full_name: string;
  email: string;
  total_verified: number;
};

type DetailRow = {
  referred_user_id: string;
  referred_email: string;
  verified_at: string;
  created_at: string;
};

export function ReferralsTab() {
  const defaultStart = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selected, setSelected] = useState<LeaderboardRow | null>(null);

  const fromTs = startDate ? new Date(startDate + "T00:00:00").toISOString() : null;
  const toTs = endDate ? new Date(endDate + "T23:59:59").toISOString() : null;

  // Server geeft "all time" totalen. Voor datum-filter halen we per-user details op.
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["admin-referrals-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_referral_leaderboard");
      if (error) throw error;
      return (data || []) as LeaderboardRow[];
    },
  });

  // Wanneer er een datumfilter actief is, halen we voor elke referrer de details op
  // en filteren we daar. Voor 't simpel houden filteren we alleen de zichtbare totalen
  // door per top-row te tellen via een 2e RPC. We doen dat alleen als filter actief is.
  const { data: filteredCounts } = useQuery({
    queryKey: ["admin-referrals-filtered", fromTs, toTs, leaderboard?.length],
    enabled: !!leaderboard && (!!fromTs || !!toTs),
    queryFn: async () => {
      if (!leaderboard) return {} as Record<string, number>;
      const entries = await Promise.all(
        leaderboard.map(async (r) => {
          const { data } = await supabase.rpc("admin_get_referral_details", {
            p_referrer_user_id: r.referrer_user_id,
            p_from: fromTs,
            p_to: toTs,
          });
          return [r.referrer_user_id, (data as DetailRow[] | null)?.length || 0] as const;
        })
      );
      return Object.fromEntries(entries);
    },
  });

  const rows = useMemo(() => {
    if (!leaderboard) return [];
    if (!fromTs && !toTs) return leaderboard;
    return leaderboard
      .map((r) => ({ ...r, total_verified: filteredCounts?.[r.referrer_user_id] ?? 0 }))
      .filter((r) => r.total_verified > 0)
      .sort((a, b) => b.total_verified - a.total_verified);
  }, [leaderboard, filteredCounts, fromTs, toTs]);

  const { data: details } = useQuery({
    queryKey: ["admin-referral-details", selected?.referrer_user_id, fromTs, toTs],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_referral_details", {
        p_referrer_user_id: selected!.referrer_user_id,
        p_from: fromTs,
        p_to: toTs,
      });
      if (error) throw error;
      return (data || []) as DetailRow[];
    },
  });

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="ref-from">Vanaf</Label>
            <Input id="ref-from" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref-to">Tot en met</Label>
            <Input id="ref-to" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }}>
              Wis filter
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(defaultStart); setEndDate(defaultEnd); }}>
              Laatste 30 dagen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Naam</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="text-right">Aangeleverd</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Laden…</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Geen referrals gevonden.</TableCell></TableRow>
              )}
              {rows.map((r, idx) => (
                <TableRow
                  key={r.referrer_user_id}
                  className="cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <TableCell className="font-medium flex items-center gap-1">
                    {idx < 3 && <Trophy className="h-3 w-3 text-primary" />}
                    {idx + 1}
                  </TableCell>
                  <TableCell>{r.full_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email || "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{r.total_verified}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Referrals van {selected?.full_name || selected?.email}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Bevestigd op</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(details || []).length === 0 && (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Geen referrals in deze periode.</TableCell></TableRow>
                )}
                {(details || []).map((d) => (
                  <TableRow key={d.referred_user_id}>
                    <TableCell>{d.referred_email}</TableCell>
                    <TableCell>{format(new Date(d.verified_at), "d MMM yyyy HH:mm", { locale: nl })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
