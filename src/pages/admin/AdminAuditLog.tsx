import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireRole } from "@/hooks/useAuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

type ColumnDef = {
  key: string;
  label: string;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
};

type QueryResult = {
  title: string;
  description: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
};

function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "—";
  try {
    return new Date(value).toLocaleString("nl-NL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function truncate(value: unknown, max = 80): string {
  if (value == null) return "—";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

const AdminAuditLog = () => {
  const { allowed, loading: authLoading } = useRequireRole("admin", { redirectTo: "/" });
  const [result, setResult] = useState<QueryResult | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!allowed) return null;

  async function runLoginFailures() {
    setActiveQuery("login-failures");
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from("audit_log")
        .select("created_at, ip_hash, metadata, endpoint")
        .eq("event_name", "AUTH_LOGIN_FAILED")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;

      // Aggregate per ip_hash
      const counts = new Map<string, { ip_hash: string; attempts: number; last_seen: string }>();
      for (const row of data ?? []) {
        const key = row.ip_hash ?? "(geen ip)";
        const prev = counts.get(key);
        if (prev) {
          prev.attempts += 1;
          if (row.created_at > prev.last_seen) prev.last_seen = row.created_at;
        } else {
          counts.set(key, { ip_hash: key, attempts: 1, last_seen: row.created_at });
        }
      }
      const aggregated = [...counts.values()].sort((a, b) => b.attempts - a.attempts);

      setResult({
        title: "Login-failures laatste uur",
        description: `Totaal ${data?.length ?? 0} mislukte logins, gegroepeerd per IP-hash. Bij ≥5 pogingen: onderzoek nader.`,
        columns: [
          {
            key: "ip_hash",
            label: "IP-hash",
            render: (v) => <code className="text-xs">{truncate(v, 24)}</code>,
          },
          {
            key: "attempts",
            label: "Pogingen",
            render: (v) => (
              <span className={typeof v === "number" && v >= 5 ? "font-semibold text-destructive" : ""}>
                {String(v)}
              </span>
            ),
          },
          { key: "last_seen", label: "Laatste poging", render: formatDate },
        ],
        rows: aggregated as unknown as Record<string, unknown>[],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query gefaald");
      toast({ title: "Query gefaald", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function runResetSpikes() {
    setActiveQuery("reset-spikes");
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from("audit_log")
        .select("created_at, ip_hash, metadata")
        .eq("event_name", "AUTH_PASSWORD_RESET_REQUESTED")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;

      // Group per minute
      const buckets = new Map<string, number>();
      for (const row of data ?? []) {
        const minute = row.created_at.slice(0, 16); // YYYY-MM-DDTHH:MM
        buckets.set(minute, (buckets.get(minute) ?? 0) + 1);
      }
      const rows = [...buckets.entries()]
        .map(([minute, count]) => ({ minute, count }))
        .sort((a, b) => (a.minute < b.minute ? 1 : -1));

      setResult({
        title: "Password-reset spikes laatste 10 min",
        description: `Totaal ${data?.length ?? 0} reset-aanvragen, per minuut.`,
        columns: [
          {
            key: "minute",
            label: "Minuut",
            render: (v) =>
              typeof v === "string"
                ? new Date(`${v}:00Z`).toLocaleString("nl-NL", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—",
          },
          {
            key: "count",
            label: "Aanvragen",
            render: (v) => (
              <span className={typeof v === "number" && v >= 5 ? "font-semibold text-destructive" : ""}>
                {String(v)}
              </span>
            ),
          },
        ],
        rows: rows as unknown as Record<string, unknown>[],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query gefaald");
      toast({ title: "Query gefaald", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function runTopAdminActions() {
    setActiveQuery("admin-actions");
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from("admin_actions")
        .select("created_at, action_type, target_type, target_id, reason, admin_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (err) throw err;

      setResult({
        title: "Admin-acties laatste 7 dagen",
        description: `${data?.length ?? 0} moderation-acties (max 200 getoond).`,
        columns: [
          { key: "created_at", label: "Wanneer", render: formatDate },
          { key: "action_type", label: "Actie" },
          { key: "target_type", label: "Type" },
          { key: "target_id", label: "Target", render: (v) => <code className="text-xs">{truncate(v, 12)}</code> },
          { key: "reason", label: "Reden", render: (v) => truncate(v, 60) },
        ],
        rows: (data ?? []) as unknown as Record<string, unknown>[],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query gefaald");
      toast({ title: "Query gefaald", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function runDealPublishSpikes() {
    setActiveQuery("deal-spikes");
    setLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error: err } = await supabase
        .from("audit_log")
        .select("created_at, user_id, metadata")
        .in("event_name", ["DEAL_PUBLISHED", "DEAL_UPDATED"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (err) throw err;

      // Group per merchant_id (uit metadata) of user_id als fallback
      const counts = new Map<string, { merchant: string; count: number; last_seen: string }>();
      for (const row of data ?? []) {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const merchantId =
          (typeof meta.merchant_id === "string" && meta.merchant_id) ||
          row.user_id ||
          "(onbekend)";
        const prev = counts.get(merchantId);
        if (prev) {
          prev.count += 1;
          if (row.created_at > prev.last_seen) prev.last_seen = row.created_at;
        } else {
          counts.set(merchantId, { merchant: merchantId, count: 1, last_seen: row.created_at });
        }
      }
      const aggregated = [...counts.values()].sort((a, b) => b.count - a.count);

      setResult({
        title: "Deal publish/update spikes laatste 24u (per merchant)",
        description: `Totaal ${data?.length ?? 0} deal-events. Bij ≥10 voor dezelfde merchant: mogelijk spam of bug.`,
        columns: [
          {
            key: "merchant",
            label: "Merchant / User ID",
            render: (v) => <code className="text-xs">{truncate(v, 24)}</code>,
          },
          {
            key: "count",
            label: "Events",
            render: (v) => (
              <span className={typeof v === "number" && v >= 10 ? "font-semibold text-destructive" : ""}>
                {String(v)}
              </span>
            ),
          },
          { key: "last_seen", label: "Laatste event", render: formatDate },
        ],
        rows: aggregated as unknown as Record<string, unknown>[],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query gefaald");
      toast({ title: "Query gefaald", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const queries = [
    {
      id: "login-failures",
      label: "Login-failures laatste uur",
      description: "Mislukte logins, gegroepeerd per IP-hash",
      run: runLoginFailures,
    },
    {
      id: "reset-spikes",
      label: "Reset-spikes laatste 10 min",
      description: "Password-reset aanvragen per minuut",
      run: runResetSpikes,
    },
    {
      id: "admin-actions",
      label: "Top admin-acties laatste week",
      description: "Recente moderation-acties uit admin_actions",
      run: runTopAdminActions,
    },
    {
      id: "deal-spikes",
      label: "Deal-publish spikes 24u",
      description: "DEAL_PUBLISHED + DEAL_UPDATED per merchant",
      run: runDealPublishSpikes,
    },
  ];

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-6">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar admin
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Audit log</h1>
      <p className="text-muted-foreground mb-6">
        Snelle queries op <code>audit_log</code> en <code>admin_actions</code>. Alleen admins kunnen
        deze data zien (RLS).
      </p>

      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        {queries.map((q) => (
          <Card
            key={q.id}
            className={`cursor-pointer transition-colors ${
              activeQuery === q.id ? "border-primary" : "hover:border-primary/50"
            }`}
            onClick={() => !loading && q.run()}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{q.label}</CardTitle>
              <CardDescription>{q.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={activeQuery === q.id ? "default" : "outline"}
                size="sm"
                disabled={loading && activeQuery === q.id}
                onClick={(e) => {
                  e.stopPropagation();
                  q.run();
                }}
              >
                {loading && activeQuery === q.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Laden…
                  </>
                ) : (
                  "Uitvoeren"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.title}</CardTitle>
            <CardDescription>{result.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {result.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Geen resultaten in deze periode.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((c) => (
                      <TableHead key={c.key}>{c.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i}>
                      {result.columns.map((c) => (
                        <TableCell key={c.key}>
                          {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAuditLog;
