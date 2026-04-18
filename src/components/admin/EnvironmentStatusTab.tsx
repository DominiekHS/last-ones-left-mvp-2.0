import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, HelpCircle, RefreshCw } from "lucide-react";

interface ServiceCheck {
  key: string;
  name: string;
  status: "ok" | "missing" | "unknown";
  description: string;
}

interface EnvStatus {
  ok: boolean;
  project_host: string;
  checked_at: string;
  checks: ServiceCheck[];
}

function renderStatusIcon(status: ServiceCheck["status"]) {
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (status === "missing") return <XCircle className="h-5 w-5 text-destructive" />;
  return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
}

function renderStatusBadge(status: ServiceCheck["status"]) {
  if (status === "ok") return <Badge className="bg-success text-success-foreground hover:bg-success">OK</Badge>;
  if (status === "missing") return <Badge variant="destructive">Ontbreekt</Badge>;
  return <Badge variant="secondary">Onbekend</Badge>;
}

export function EnvironmentStatusTab() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<EnvStatus>({
    queryKey: ["admin-env-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-env-status");
      if (error) throw error;
      return data as EnvStatus;
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Systeem status</CardTitle>
              <CardDescription>
                Overzicht van alle backend-services. Geen waardes worden getoond — alleen of de configuratie aanwezig is.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Status ophalen…</p>}
          {error && (
            <p className="text-destructive">
              Kon status niet ophalen: {(error as Error).message}
            </p>
          )}
          {data && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/40">
                <div className="flex items-center gap-3">
                  {data.ok ? (
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  ) : (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {data.ok ? "Alle services OK" : "Eén of meer services missen"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Database: <code className="text-xs bg-background px-1.5 py-0.5 rounded">{data.project_host}</code>
                      {" · "}
                      Gecontroleerd: {new Date(data.checked_at).toLocaleString("nl-NL")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {data.checks.map((c) => (
                  <div key={c.key} className="flex items-start gap-3 rounded-md border p-3">
                    <div className="mt-0.5">
                      {renderStatusIcon(c.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{c.name}</p>
                        {renderStatusBadge(c.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{c.key}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
