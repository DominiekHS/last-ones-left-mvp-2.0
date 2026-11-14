import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { CATEGORIES } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export function NotificationChoicesTab() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const { data, isPending, isError } = useQuery({ queryKey: ["admin-notification-choices"], queryFn: async () => {
    const [choices, merchants, tests] = await Promise.all([
      fetchAllRows((from, to) => supabase.from("notification_choices").select("*").order("kind").order("key").range(from, to)),
      fetchAllRows((from, to) => supabase.from("merchants").select("id,company_name,blocked,status,deleted_at").order("id").range(from, to)),
      fetchAllRows((from, to) => supabase.from("test_merchants").select("merchant_id").order("merchant_id").range(from, to)),
    ]);
    const testIds = new Set(tests.map(t => t.merchant_id));
    return { choices, merchants: merchants.filter(m => !m.blocked && m.status === "active" && !m.deleted_at && !testIds.has(m.id)).sort((a,b) => a.company_name.localeCompare(b.company_name,"nl")) };
  }});
  const toggle = async (kind: string, key: string, enabled: boolean) => {
    setPending(`${kind}-${key}`);
    const { error } = await supabase.from("notification_choices").upsert({ kind, key, enabled }, { onConflict: "kind,key" });
    if (error) toast({ title: "Niet opgeslagen", description: error.message, variant: "destructive" });
    else {
      await Promise.all([client.invalidateQueries({ queryKey: ["admin-notification-choices"] }), client.invalidateQueries({ queryKey: ["notification-choices"] })]);
      toast({ title: "Meldingskeuze bijgewerkt" });
    }
    setPending(null);
  };
  if (isPending) return <p className="py-4 text-muted-foreground">Keuzes laden…</p>;
  if (isError) return <p role="alert" className="py-4 text-destructive">Keuzes konden niet worden geladen.</p>;
  const row = (kind: string, key: string, label: string) => <div key={key} className="flex items-start gap-2 py-2 min-w-0">
    <Checkbox id={`admin-choice-${kind}-${key}`} className="mt-0.5 shrink-0" checked={data?.choices.some(c => c.kind === kind && c.key === key && c.enabled) || false} disabled={pending !== null} onCheckedChange={v => toggle(kind, key, v === true)} />
    <Label htmlFor={`admin-choice-${kind}-${key}`} className="cursor-pointer leading-5 break-words min-w-0">{label}</Label>
  </div>;
  return <section className="space-y-6 py-4">
    <h2 className="font-display text-xl font-semibold">Keuzes voor persoonlijke meldingen</h2>
    <div><h3 className="font-semibold mb-2">Activiteiten</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">{CATEGORIES.map(c => row("category", c.value, c.label))}</div></div>
    <div className="space-y-3"><h3 className="font-semibold">Bedrijven</h3><Input aria-label="Zoek bedrijf voor meldingen" placeholder="Zoek bedrijf…" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">{data?.merchants.filter(m => m.company_name.toLocaleLowerCase("nl").includes(search.toLocaleLowerCase("nl"))).map(m => row("merchant", m.id, m.company_name))}</div>
    </div>
  </section>;
}