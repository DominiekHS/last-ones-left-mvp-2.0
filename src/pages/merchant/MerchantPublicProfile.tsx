import { useParams, Link, useNavigate } from "react-router-dom";
import { useMerchantPublicProfile, useMerchantActiveDeals } from "@/hooks/useMerchantProfile";
import { useAuth } from "@/hooks/useAuth";
import { DealCard } from "@/components/deals/DealCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS } from "@/lib/constants";
import { ArrowLeft, MapPin, Mail, Phone, Globe, Store, Ticket } from "lucide-react";

export default function MerchantPublicProfile() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: merchant, isLoading } = useMerchantPublicProfile(merchantId);
  const { data: deals, isLoading: dealsLoading } = useMerchantActiveDeals(merchantId);

  if (isLoading) {
    return (
      <div className="container py-6 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="container py-16 text-center space-y-3">
        <Store className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">Bedrijf niet gevonden</h2>
        <p className="text-muted-foreground">Dit bedrijf bestaat niet of is niet meer beschikbaar.</p>
        <Button variant="link" asChild>
          <Link to="/">Terug naar deals</Link>
        </Button>
      </div>
    );
  }

  const addressParts = [merchant.address, merchant.postcode, merchant.city].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : null;
  const logoUrl = (merchant as any).logo_url as string | null;
  const contactEmail = (merchant as any).contact_email as string;
  const contactPhone = (merchant as any).contact_phone as string;
  const websiteUrl = (merchant as any).website_url as string;
  const hasContact = contactEmail || contactPhone || websiteUrl;

  return (
    <div className="container py-4 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-1 h-4 w-4" />Terug
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={merchant.company_name}
            className="w-20 h-20 rounded-full object-cover border-2 border-border shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-display text-2xl font-bold shrink-0">
            {merchant.company_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="space-y-1 min-w-0">
          <h1 className="font-display text-2xl font-bold">{merchant.company_name}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{CATEGORY_LABELS[merchant.venue_type] || merchant.venue_type}</Badge>
            {merchant.city && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />{merchant.city}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Over dit bedrijf */}
      {merchant.description && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Over {merchant.company_name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{merchant.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Locatie */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />Locatie
          </h2>
          <p className="text-sm text-muted-foreground">
            {fullAddress || "Adres niet ingevuld."}
          </p>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />Contact
          </h2>
          {hasContact ? (
            <div className="space-y-2 text-sm">
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" />{contactEmail}
                </a>
              )}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" />{contactPhone}
                </a>
              )}
              {websiteUrl && (
                <a href={websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <Globe className="h-3.5 w-3.5" />{websiteUrl}
                </a>
              )}
              {!user && (contactEmail || contactPhone) === undefined && websiteUrl && (
                <p className="text-xs text-muted-foreground pt-1">
                  <Link to="/login" className="text-primary hover:underline">Log in</Link> om e-mail en telefoonnummer te zien.
                </p>
              )}
            </div>
          ) : !user ? (
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">Log in</Link> om contactgegevens van dit bedrijf te zien.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Geen contactgegevens ingevuld.</p>
          )}
        </CardContent>
      </Card>

      {/* Actieve deals */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />Actieve deals
        </h2>
        <p className="text-sm text-muted-foreground">Alle deals van dit bedrijf die nog beschikbaar zijn.</p>
        {dealsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        ) : deals && deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <Ticket className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Geen actieve deals op dit moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
