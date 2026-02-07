import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Ban, CheckCircle, Globe, Mail, Phone, Tag } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { CATEGORY_LABELS } from "@/lib/constants";

const DAY_LABELS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function AdminMerchantDetail() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const queryClient = useQueryClient();

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

  const toggleBlock = async () => {
    if (!merchant) return;
    const { error } = await supabase
      .from("merchants")
      .update({ blocked: !merchant.blocked })
      .eq("id", merchant.id);
    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-merchant", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
      toast({ title: merchant.blocked ? "Ondernemer gedeblokkeerd" : "Ondernemer geblokkeerd" });
    }
  };

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

  const activeDeals = deals?.filter((d) => new Date(d.expiry_time) > new Date()) || [];
  const openingHours = merchant.opening_hours as Record<string, { open: string; close: string; closed?: boolean }> | null;

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-1 h-4 w-4" />Terug naar overzicht
        </Button>
        <Button
          variant={merchant.blocked ? "default" : "outline"}
          size="sm"
          onClick={toggleBlock}
        >
          {merchant.blocked ? (
            <><CheckCircle className="mr-1 h-4 w-4" />Deblokkeer</>
          ) : (
            <><Ban className="mr-1 h-4 w-4" />Blokkeer</>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {merchant.logo_url && (
          <img src={merchant.logo_url} alt={merchant.company_name} className="h-12 w-12 rounded-full object-cover" />
        )}
        <h1 className="font-display text-2xl font-bold">{merchant.company_name}</h1>
        <Badge variant={merchant.blocked ? "destructive" : "default"}>
          {merchant.blocked ? "Geblokkeerd" : "Actief"}
        </Badge>
        <Badge variant="outline">{CATEGORY_LABELS[merchant.venue_type] || merchant.venue_type}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Basis info */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Basisgegevens</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoRow label="Lid sinds" value={format(new Date(merchant.created_at), "d MMMM yyyy", { locale: nl })} />
            {merchant.description && <InfoRow label="Omschrijving" value={merchant.description} />}
            <InfoRow label="Adres" value={[merchant.address, merchant.postcode, merchant.city].filter(Boolean).join(", ")} />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Contactgegevens</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {merchant.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{merchant.contact_email}</span>
              </div>
            )}
            {merchant.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{merchant.contact_phone}</span>
              </div>
            )}
            {merchant.website_url && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={merchant.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {merchant.website_url}
                </a>
              </div>
            )}
            {!merchant.contact_email && !merchant.contact_phone && !merchant.website_url && (
              <p className="text-muted-foreground">Geen contactgegevens ingevuld.</p>
            )}
          </CardContent>
        </Card>

        {/* Openingstijden */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Openingstijden</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {openingHours && Object.keys(openingHours).length > 0 ? (
              <div className="space-y-1">
                {DAY_KEYS.map((key, i) => {
                  const day = openingHours[key];
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{DAY_LABELS[i]}</span>
                      <span>{day?.closed ? "Gesloten" : day ? `${day.open} – ${day.close}` : "—"}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">Geen openingstijden ingevuld.</p>
            )}
          </CardContent>
        </Card>

        {/* Deals */}
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
      </div>
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
