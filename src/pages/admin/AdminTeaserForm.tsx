import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { uploadImage } from "@/lib/storage-uploads";
import { compressImage } from "@/lib/image-compress";
import { ArrowLeft } from "lucide-react";
import { recordAdminAction } from "@/lib/audit";

// Vaste system-merchant "Last Ones Left" die eigenaar is van alle teasers.
const SYSTEM_MERCHANT_ID = "da422c68-1f5f-4e7d-8168-c44d6e4cd2ee";

// Sentinel-waarden — teasers hebben nog geen echte prijzen/tijden,
// maar de tabel eist NOT NULL op deze velden. Deze waarden worden
// nergens getoond dankzij de teaser-branch in DealCard/DealDetail.
const TEASER_SENTINELS = {
  // Moet voldoen aan CHECK (>0 en <=100) op discount_percentage.
  // Wordt nooit getoond dankzij de teaser-branch in DealCard/DealDetail.
  original_price: 1,
  discount_percentage: 1,
  // 100 jaar in de toekomst — de publieke view filtert op expiry > now()
  expiry_time_iso: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
};

export default function AdminTeaserForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("overig");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [alwaysShow, setAlwaysShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      const { data, error } = await (supabase.from("deals") as any)
        .select(
          "id, title, category, city, postal_code, address, image_url, " +
          "teaser_body, teaser_cta_label, teaser_cta_url, always_show, is_teaser"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        toast({
          title: "Laden mislukt",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      if (data) {
        setTitle(data.title || "");
        setCategory(data.category || "overig");
        setCity(data.city || "");
        setPostalCode(data.postal_code || "");
        setAddress(data.address || "");
        setImageUrl(data.image_url || "");
        setBody(data.teaser_body || "");
        setCtaLabel(data.teaser_cta_label || "");
        setCtaUrl(data.teaser_cta_url || "");
        setAlwaysShow(!!data.always_show);
      }
    })();
  }, [id, isEdit]);

  if (!loading && (!user || !roles.includes("admin"))) {
    return <Navigate to="/" />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 3) {
      toast({ title: "Titel te kort", description: "Minimaal 3 tekens.", variant: "destructive" });
      return;
    }
    if (city.trim().length < 2) {
      toast({ title: "Plaats verplicht", variant: "destructive" });
      return;
    }
    if (body.trim().length < 20) {
      toast({ title: "Uitleg te kort", description: "Minimaal 20 tekens.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const compressed = await compressImage(imageFile, {
          maxDim: 1600,
          quality: 0.82,
          mimeType: "image/jpeg",
        });
        const uploaded = await uploadImage({
          bucket: "deal-images",
          userId: user.id,
          file: compressed,
          subfolder: "teasers",
        });
        finalImageUrl = uploaded.url;
      }

      if (!finalImageUrl && !isEdit) {
        toast({ title: "Afbeelding verplicht", variant: "destructive" });
        setSaving(false);
        return;
      }

      const payload: any = {
        title: title.trim(),
        category,
        city: city.trim(),
        postal_code: postalCode.trim(),
        address: address.trim(),
        image_url: finalImageUrl,
        teaser_body: body.trim(),
        teaser_cta_label: ctaLabel.trim() || null,
        teaser_cta_url: ctaUrl.trim() || null,
        always_show: alwaysShow,
        is_teaser: true,
      };

      if (isEdit) {
        const { error } = await (supabase.from("deals") as any)
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        void recordAdminAction({
          action_type: "teaser_update",
          target_type: "deal",
          target_id: id!,
          reason: "Proefadvertentie bijgewerkt",
        });
        toast({ title: "Proefadvertentie bijgewerkt" });
      } else {
        const { data, error } = await (supabase.from("deals") as any)
          .insert({
            ...payload,
            merchant_id: SYSTEM_MERCHANT_ID,
            original_price: TEASER_SENTINELS.original_price,
            discount_percentage: TEASER_SENTINELS.discount_percentage,
            expiry_time: TEASER_SENTINELS.expiry_time_iso,
            start_time_mode: "flexible",
          })
          .select("id")
          .single();
        if (error) throw error;
        void recordAdminAction({
          action_type: "teaser_create",
          target_type: "deal",
          target_id: data.id,
          reason: "Proefadvertentie aangemaakt",
        });
        toast({ title: "Proefadvertentie aangemaakt" });
      }

      navigate("/admin");
    } catch (err: any) {
      toast({
        title: "Opslaan mislukt",
        description: err?.message || "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4 max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" />Terug naar admin</Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold">
          {isEdit ? "Proefadvertentie bewerken" : "Nieuwe proefadvertentie"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Een proefadvertentie ziet eruit als een deal, maar heeft geen prijs of kortingscode. Zodra een bedrijf in dezelfde categorie én plaats een echte deal plaatst, verdwijnt de proefadvertentie automatisch (tenzij je "altijd tonen" aanzet).
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label>Titel *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categorie *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Plaats *</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Postcode</Label>
                <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Adres</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Afbeelding {isEdit ? "" : "*"}</Label>
              {imageUrl && (
                <img src={imageUrl} alt="preview" className="h-32 w-auto rounded border object-cover" />
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-1">
              <Label>Uitlegtekst * <span className="text-xs text-muted-foreground">(min. 20 tekens)</span></Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={500}
                required
              />
              <p className="text-xs text-muted-foreground">Zichtbaar op de detailpagina; leg uit waarom deze plek er staat en wat consumenten kunnen doen.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Knoptekst (optioneel)</Label>
                <Input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Bijv. Deel met vrienden"
                  maxLength={60}
                />
              </div>
              <div className="space-y-1">
                <Label>Knop-URL (optioneel)</Label>
                <Input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://... of /pad"
                  maxLength={300}
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={alwaysShow}
                onCheckedChange={(v) => setAlwaysShow(!!v)}
              />
              <span className="text-sm">
                <span className="font-medium">Altijd tonen</span>
                <span className="block text-xs text-muted-foreground">Blijft óók zichtbaar als er echte deals bestaan in dezelfde categorie + plaats.</span>
              </span>
            </label>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? "Bezig..." : isEdit ? "Opslaan" : "Proefadvertentie aanmaken"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/admin">Annuleren</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
