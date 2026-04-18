import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Search, MapPin, Tag, Mail, Inbox, Trash2 } from "lucide-react";
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

type Status = "all" | "new" | "reviewed" | "done";

const STATUS_LABEL: Record<Exclude<Status, "all">, string> = {
  new: "Nieuw",
  reviewed: "Bekeken",
  done: "Afgehandeld",
};

const STATUS_VARIANT: Record<Exclude<Status, "all">, "default" | "secondary" | "outline"> = {
  new: "default",
  reviewed: "secondary",
  done: "outline",
};

export function ActivityRequestsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status>("all");
  const [search, setSearch] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-activity-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    let list = requests || [];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.message.toLowerCase().includes(q) ||
          (r.context_city || "").toLowerCase().includes(q) ||
          (r.user_email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, statusFilter, search]);

  const updateStatus = async (id: string, status: "new" | "reviewed" | "done") => {
    const { error } = await supabase.from("activity_requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Status bijgewerkt" });
    queryClient.invalidateQueries({ queryKey: ["admin-activity-requests"] });
  };

  const deleteRequest = async (id: string) => {
    const { error } = await supabase.from("activity_requests").delete().eq("id", id);
    if (error) {
      toast({ title: "Verwijderen mislukt", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Voorkeur verwijderd" });
    queryClient.invalidateQueries({ queryKey: ["admin-activity-requests"] });
  };

  const counts = useMemo(() => {
    const c = { new: 0, reviewed: 0, done: 0 };
    for (const r of requests || []) {
      if (r.status === "new" || r.status === "reviewed" || r.status === "done") c[r.status]++;
    }
    return c;
  }, [requests]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "new", "reviewed", "done"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? `Alle (${requests?.length || 0})` : `${STATUS_LABEL[s]} (${counts[s]})`}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek op activiteit, plaats of e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laden…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nog geen voorkeuren ontvangen.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium break-words">{r.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "d MMM yyyy 'om' HH:mm", { locale: nl })}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status as "new" | "reviewed" | "done"] || "outline"}>
                    {STATUS_LABEL[r.status as "new" | "reviewed" | "done"] || r.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {r.context_city && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.context_city}
                    </Badge>
                  )}
                  {r.context_category && (
                    <Badge variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {r.context_category}
                    </Badge>
                  )}
                  {r.user_email && (
                    <Badge variant="outline" className="gap-1">
                      <Mail className="h-3 w-3" />
                      {r.user_email}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {r.status !== "reviewed" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "reviewed")}>
                      Markeer als bekeken
                    </Button>
                  )}
                  {r.status !== "done" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "done")}>
                      Afgehandeld
                    </Button>
                  )}
                  {r.status !== "new" && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "new")}>
                      Terug naar nieuw
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="ml-auto gap-1">
                        <Trash2 className="h-3 w-3" />
                        Verwijderen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Voorkeur verwijderen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Deze actie kan niet ongedaan worden gemaakt.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRequest(r.id)}>Verwijderen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
