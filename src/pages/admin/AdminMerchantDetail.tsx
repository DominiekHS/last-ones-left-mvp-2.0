import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Ban, CheckCircle, Clock, Globe, Mail, Phone, Tag, ShieldAlert, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CATEGORY_LABELS } from "@/lib/constants";
import { getMerchantEffectiveStatus, STATUS_LABELS, STATUS_VARIANTS } from "@/lib/merchant-status";
import { MerchantStatusModal } from "@/components/admin/MerchantStatusModal";

import { useState } from "react";

export default function AdminMerchantDetail() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const queryClient = useQueryClient();
  const [statusModal, setStatusModal] = useState<{ open: boolean; action: "suspend" | "block" | "activate" }>({ open: false, action: "suspend" });

  const { data: merchant, isLoading } = useQuery({
    queryKey: ["admin-merchant", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("id", merchantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin") && !!merchantId,
  });

  const { data: moderation } = useQuery({
    queryKey: ["admin-merchant-moderation", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("admin_get_merchant_moderation", { p_merchant_id: merchantId! });
      if (error) throw error;
      return (data?.[0] ?? null) as {
        status_reason: string | null;
        status_notes: string | null;
        status_updated_at: string | null;
        status_updated_by: string | null;
      } | null;
    },
    enabled: roles.includes("admin") && !!merchantId,
  });

  const { data: deals } = useQuery({
    queryKey: ["admin-merchant-deals", merchantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, expiry_time, discount_percentage, category, city")
        .eq("merchant_id", merchantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: roles.includes("admin") && !!merchantId,
  });


  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  if (isLoading) {
    return <div className="container py-6"><p className="text-muted-foreground">Laden...</p></div>;
  }

  if (!merchant) {
    return (
      <div className="container py-6 space-y-4">
        <Button variant="ghost" onClick={() => navigate("/admin")}><ArrowLeft className="mr-1 h-4 w-4" />Terug naar overzicht</Button>
        <p className="text-muted-foreground">Ondernemer niet gevonden.</p>
      </div>
    );
  }

  const effectiveStatus = getMerchantEffectiveStatus(merchant as any);
  const activeDeals = deals?.filter((d) => new Date(d.expiry_time) > new Date()) || [];
  return (
    <div className="container py-6 space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/admin")}>
        <ArrowLeft className="mr-1 h-4 w-4" />Terug naar overzicht
      </Button>

      {/* Title row */}
      <div className="flex items-center gap-3 flex-wrap">
        {merchant.logo_url && (
          <img src={merchant.logo_url} alt={merchant.company_name} className="h-12 w-12 rounded-full object-cover" />
        )}
        <h1 className="font-display text-2xl font-bold">{merchant.company_name}</h1>
        <Badge variant={STATUS_VARIANTS[effectiveStatus]}>{STATUS_LABELS[effectiveStatus]}</Badge>
        <Badge variant="outline">{CATEGORY_LABELS[merchant.venue_type] || merchant.venue_type}</Badge>
      </div>

      {/* Status & Actions card */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Status & acties</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span>Status: <strong>{STATUS_LABELS[effectiveStatus]}</strong></span>
            {effectiveStatus === "suspended" && merchant.suspended_until && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Tot: {format(new Date(merchant.suspended_until), "d MMMM yyyy HH:mm", { locale: nl })}
              </span>
            )}
            {merchant.status_reason && (
              <span className="text-muted-foreground">Reden: {merchant.status_reason}</span>
            )}
            {merchant.status_updated_at && (
              <span className="text-muted-foreground text-xs">
                Laatste wijziging: {format(new Date(merchant.status_updated_at), "d MMM yyyy HH:mm", { locale: nl })}
              </span>
            )}
          </div>
          {merchant.status_notes && (
            <p className="text-sm text-muted-foreground italic">"{merchant.status_notes}"</p>
          )}
          <div className="flex gap-2 flex-wrap">
            {effectiveStatus !== "suspended" && effectiveStatus !== "blocked" && (
              <Button variant="outline" size="sm" onClick={() => setStatusModal({ open: true, action: "suspend" })}>
                <ShieldAlert className="mr-1 h-4 w-4" />Schorsen
              </Button>
            )}
            {effectiveStatus !== "blocked" && (
              <Button variant="outline" size="sm" onClick={() => setStatusModal({ open: true, action: "block" })}>
                <Ban className="mr-1 h-4 w-4" />Blokkeren
              </Button>
            )}
            {effectiveStatus !== "active" && (
              <Button size="sm" onClick={() => setStatusModal({ open: true, action: "activate" })}>
                <ShieldCheck className="mr-1 h-4 w-4" />Activeren
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profiel</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Basisgegevens</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Lid sinds" value={format(new Date(merchant.created_at), "d MMMM yyyy", { locale: nl })} />
                {merchant.description && <InfoRow label="Omschrijving" value={merchant.description} />}
                <InfoRow label="Adres" value={[merchant.address, merchant.postcode, merchant.city].filter(Boolean).join(", ")} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Contactgegevens</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {merchant.contact_email && (
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{merchant.contact_email}</span></div>
                )}
                {merchant.contact_phone && (
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{merchant.contact_phone}</span></div>
                )}
                {merchant.website_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={merchant.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{merchant.website_url}</a>
                  </div>
                )}
                {!merchant.contact_email && !merchant.contact_phone && !merchant.website_url && (
                  <p className="text-muted-foreground">Geen contactgegevens ingevuld.</p>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="deals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Deals ({deals?.length || 0} totaal, {activeDeals.length} actief)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {deals && deals.length > 0 ? (
                deals.map((d) => {
                  const expired = new Date(d.expiry_time) < new Date();
                  return (
                    <Link
                      key={d.id}
                      to={`/admin/deals/${d.id}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.title}</span>
                        <Badge variant={expired ? "secondary" : "default"} className="text-xs">
                          {expired ? "Verlopen" : "Actief"}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">-{d.discount_percentage}%</span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-muted-foreground">Geen deals aangemaakt.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status modal */}
      <MerchantStatusModal
        open={statusModal.open}
        onOpenChange={(open) => setStatusModal(s => ({ ...s, open }))}
        merchantId={merchant.id}
        merchantName={merchant.company_name}
        action={statusModal.action}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground font-medium">{label}: </span>
      <span>{value}</span>
    </div>
  );
}
