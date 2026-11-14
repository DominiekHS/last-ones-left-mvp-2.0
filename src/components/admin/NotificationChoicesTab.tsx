import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetch-all";
import { CATEGORIES } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export function NotificationChoicesTab() {
  const client = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const { data, isPending, isError } = useQuery({ queryKey: ["admin-notification-choices"], queryFn: async () => {
    return fetchAllRows((from, to) => supabase.from("notification_choices").select("*").order("kind").order("key").range(from, to));
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
    <Checkbox id={`admin-choice-${kind}-${key}`} className="mt-0.5 shrink-0" checked={data?.some(c => c.kind === kind && c.key === key && c.enabled) || false} disabled={pending !== null} onCheckedChange={v => toggle(kind, key, v === true)} />
    <Label htmlFor={`admin-choice-${kind}-${key}`} className="cursor-pointer leading-5 break-words min-w-0">{label}</Label>
  </div>;
  return <section className="space-y-6 py-4">
    <h2 className="font-display text-xl font-semibold">Keuzes voor persoonlijke meldingen</h2>
    <p className="text-sm text-muted-foreground">Consumenten kiezen hieruit hun favoriete activiteiten voor persoonlijke meldingsmails.</p>
    <div><h3 className="font-semibold mb-2">Activiteiten</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4">{CATEGORIES.map(c => row("category", c.value, c.label))}</div></div>
  </section>;
}
