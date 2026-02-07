import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Upload, ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type VenueCategory = Database["public"]["Enums"]["venue_category"];

interface FormErrors {
  [key: string]: string | undefined;
}

export default function AdForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [atCounter, setAtCounter] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VenueCategory | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [checkoutLink, setCheckoutLink] = useState("");
  const [discountType, setDiscountType] = useState<"universal" | "unique">("universal");
  const [universalCode, setUniversalCode] = useState("");
  const [uniqueCodeCount, setUniqueCodeCount] = useState("");
  const [uniqueCodesText, setUniqueCodesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Load existing deal for edit
  useEffect(() => {
    if (isEdit && id) {
      supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTitle(data.title);
            setDescription(data.description);
            setCategory(data.category);
            setCity(data.city);
            setAddress((data as any).address || "");
            setOriginalPrice(String(data.original_price));
            setDiscountPercentage(String(data.discount_percentage));
            setStartTime(data.start_time.slice(0, 16));
            setExpiryTime(data.expiry_time.slice(0, 16));
            setCheckoutLink(data.checkout_link);
            setExistingImageUrl(data.image_url);
            setAtCounter((data as any).redemption_method === "at_counter");
            setDiscountType(((data as any).discount_type as "universal" | "unique") || "universal");
            if ((data as any).discount_type !== "unique") {
              setUniversalCode(data.discount_code);
            }
          }
        });

      // Load unique codes if edit
      supabase
        .from("unique_codes" as any)
        .select("code")
        .eq("deal_id", id)
        .then(({ data }: any) => {
          if (data && data.length > 0) {
            setDiscountType("unique");
            setUniqueCodeCount(String(data.length));
            setUniqueCodesText(data.map((c: any) => c.code).join("\n"));
          }
        });
    }
    if (merchant?.city && !isEdit) {
      setCity(merchant.city);
      setAddress(merchant.address);
    }
  }, [isEdit, id, merchant]);

  // Image preview
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreview(null);
  }, [imageFile]);

  // Computed
  const discountedPrice = useMemo(() => {
    const price = parseFloat(originalPrice);
    const disc = parseInt(discountPercentage);
    if (isNaN(price) || isNaN(disc) || price <= 0 || disc < 1 || disc > 100) return null;
    return (price * (1 - disc / 100)).toFixed(2);
  }, [originalPrice, discountPercentage]);

  const parsedUniqueCodes = useMemo(() => {
    return uniqueCodesText
      .split("\n")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }, [uniqueCodesText]);

  const uniqueCodesValid = useMemo(() => {
    const count = parseInt(uniqueCodeCount);
    if (isNaN(count) || count < 1) return false;
    if (parsedUniqueCodes.length !== count) return false;
    const unique = new Set(parsedUniqueCodes);
    return unique.size === parsedUniqueCodes.length;
  }, [uniqueCodeCount, parsedUniqueCodes]);

  // Validation
  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!title.trim()) e.title = "Titel is verplicht";
    if (!description.trim()) e.description = "Beschrijving is verplicht";
    if (!category) e.category = "Selecteer een categorie";
    if (!imageFile && !existingImageUrl) e.image = "Afbeelding is verplicht";
    if (imageFile && imageFile.size > 5 * 1024 * 1024) e.image = "Afbeelding mag max 5MB zijn";
    if (imageFile && !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type))
      e.image = "Alleen JPG, PNG of WEBP";
    if (!city.trim()) e.city = "Stad is verplicht";
    if (!address.trim()) e.address = "Adres is verplicht";

    const price = parseFloat(originalPrice);
    if (isNaN(price) || price < 0.01) e.originalPrice = "Prijs moet minimaal €0,01 zijn";
    const disc = parseInt(discountPercentage);
    if (isNaN(disc) || disc < 1 || disc > 100) e.discountPercentage = "Korting moet tussen 1 en 100 zijn";

    const now = new Date();
    const start = new Date(startTime);
    const expiry = new Date(expiryTime);

    if (!startTime) {
      e.startTime = "Starttijd is verplicht";
    } else if (start.getTime() < now.getTime() + 5 * 60 * 1000) {
      e.startTime = "Starttijd moet minimaal 5 minuten in de toekomst liggen";
    } else if (start.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      e.startTime = "Starttijd moet binnen 24 uur liggen";
    }

    if (!expiryTime) {
      e.expiryTime = "Verwijdertijd is verplicht";
    } else if (expiry <= now) {
      e.expiryTime = "Verwijdertijd moet in de toekomst liggen";
    } else if (startTime && expiry > start) {
      e.expiryTime = "Verwijdertijd moet vóór de starttijd liggen";
    }

    if (!atCounter) {
      if (!checkoutLink.trim()) e.checkoutLink = "Checkout link is verplicht";
      else {
        try {
          new URL(checkoutLink);
        } catch {
          e.checkoutLink = "Voer een geldige URL in";
        }
      }
    }

    if (discountType === "universal") {
      if (!universalCode.trim()) e.universalCode = "Kortingscode is verplicht";
    } else {
      const count = parseInt(uniqueCodeCount);
      if (isNaN(count) || count < 1) {
        e.uniqueCodeCount = "Voer het aantal codes in";
      } else if (parsedUniqueCodes.length !== count) {
        e.uniqueCodes = `${parsedUniqueCodes.length}/${count} codes ingevuld`;
      } else {
        const unique = new Set(parsedUniqueCodes);
        if (unique.size !== parsedUniqueCodes.length) {
          e.uniqueCodes = "Er staan dubbele codes in de lijst";
        }
      }
    }

    return e;
  };

  const isFormValid = Object.keys(validate()).length === 0;

  const touch = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return existingImageUrl;
    const ext = imageFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("deal-images").upload(path, imageFile);
    if (error) {
      toast({ title: "Upload mislukt", description: "Probeer opnieuw", variant: "destructive" });
      return null;
    }
    const { data } = supabase.storage.from("deal-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    // Touch all fields to show errors
    const allTouched: Record<string, boolean> = {};
    Object.keys(validationErrors).forEach((k) => (allTouched[k] = true));
    setTouched((t) => ({ ...t, ...allTouched }));
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;
    if (!merchant) return;

    setSaving(true);
    const imageUrl = await uploadImage();
    if (imageFile && !imageUrl) {
      setSaving(false);
      return;
    }

    const dealData = {
      merchant_id: merchant.id,
      title: title.trim(),
      description: description.trim(),
      category: category as VenueCategory,
      city: city.trim(),
      address: address.trim(),
      original_price: parseFloat(originalPrice),
      discount_percentage: parseInt(discountPercentage),
      start_time: new Date(startTime).toISOString(),
      expiry_time: new Date(expiryTime).toISOString(),
      checkout_link: atCounter ? "" : checkoutLink.trim(),
      discount_code: discountType === "universal" ? universalCode.trim() : "",
      image_url: imageUrl,
      redemption_method: atCounter ? "at_counter" : "online_checkout",
      discount_type: discountType,
    };

    let dealId = id;
    let error;

    if (isEdit) {
      ({ error } = await supabase.from("deals").update(dealData).eq("id", id!));
    } else {
      const res = await supabase.from("deals").insert(dealData).select("id").single();
      error = res.error;
      dealId = res.data?.id;
    }

    if (error) {
      toast({ title: "Er ging iets mis", description: "Probeer opnieuw", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Handle unique codes
    if (discountType === "unique" && dealId) {
      // Delete existing codes on edit
      if (isEdit) {
        await (supabase.from("unique_codes" as any) as any).delete().eq("deal_id", dealId);
      }
      const codes = parsedUniqueCodes.map((code) => ({
        deal_id: dealId!,
        code,
        status: "available",
      }));
      const { error: codesError } = await (supabase.from("unique_codes" as any) as any).insert(codes);
      if (codesError) {
        toast({ title: "Codes opslaan mislukt", description: codesError.message, variant: "destructive" });
      }
    }

    toast({ title: isEdit ? "Advertentie bijgewerkt!" : "Advertentie geplaatst!" });
    navigate("/merchant");
    setSaving(false);
  };

  if (!authLoading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  const showError = (field: string) => touched[field] ? errors[field] || validate()[field] : undefined;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container py-6 max-w-lg">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 border-0"
              onClick={() => navigate("/merchant")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-display text-2xl font-bold">
                {isEdit ? "Advertentie bewerken" : "Advertentie maken"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Vul je lege plekken en trek nieuwe klanten aan
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="container max-w-lg py-6 space-y-5">
        {/* Warning banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-semibold text-sm">Let op: Starttijd moet binnen 24 uur liggen</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dit is een last-minute marketplace. Activiteiten die later starten kunnen niet worden geplaatst.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 1: Korting verzilveren */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Hoe wordt de korting verzilverd?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="font-medium">Korting aan de kassa</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gebruik dit als klanten niet online kunnen betalen (bijv. consumptie aan de kassa).
                </p>
              </div>
              <Switch checked={atCounter} onCheckedChange={setAtCounter} />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Basisinformatie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Basisinformatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => touch("title")}
                placeholder="Bijv. 'Vanavond naar de nieuwste thriller!'"
              />
              {showError("title") && <p className="text-xs text-destructive">{showError("title")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Beschrijving *</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => touch("description")}
                rows={3}
                placeholder="Beschrijf de activiteit, wat maakt het speciaal?"
              />
              {showError("description") && <p className="text-xs text-destructive">{showError("description")}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Categorie & Afbeelding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Categorie & Afbeelding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Categorie *</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v as VenueCategory); touch("category"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer categorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showError("category") && <p className="text-xs text-destructive">{showError("category")}</p>}
            </div>
            <div className="space-y-2">
              <Label>Afbeelding *</Label>
              <div
                className="border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("image-upload")?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) { setImageFile(file); touch("image"); }
                }}
              >
                {imagePreview || (existingImageUrl && !imageFile) ? (
                  <img
                    src={imagePreview || existingImageUrl!}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded-md object-cover"
                  />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Sleep je afbeelding hierheen</p>
                    <p className="text-xs text-muted-foreground my-1">of</p>
                    <Button type="button" variant="outline" size="sm">Kies bestand</Button>
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG of WEBP • Max 5MB</p>
                  </>
                )}
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { setImageFile(e.target.files?.[0] || null); touch("image"); }}
              />
              {imageFile && (
                <p className="text-xs text-muted-foreground">{imageFile.name}</p>
              )}
              {showError("image") && <p className="text-xs text-destructive">{showError("image")}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Locatie */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Locatie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Stad *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => touch("city")}
              />
              {showError("city") && <p className="text-xs text-destructive">{showError("city")}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => touch("address")}
              />
              {showError("address") && <p className="text-xs text-destructive">{showError("address")}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Prijs & Korting */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Prijs & Korting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Originele prijs (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  onBlur={() => touch("originalPrice")}
                />
                {showError("originalPrice") && <p className="text-xs text-destructive">{showError("originalPrice")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Korting (%) *</Label>
                <Input
                  id="discount"
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  onBlur={() => touch("discountPercentage")}
                />
                {showError("discountPercentage") && <p className="text-xs text-destructive">{showError("discountPercentage")}</p>}
              </div>
            </div>
            {discountedPrice && (
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">Prijs na korting:</p>
                <p className="font-display text-xl font-bold">€{discountedPrice}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Timing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Starttijd activiteit *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  onBlur={() => touch("startTime")}
                />
                <p className="text-xs text-muted-foreground">Moet binnen 24 uur liggen</p>
                {showError("startTime") && <p className="text-xs text-destructive">{showError("startTime")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Advertentie verwijderen om *</Label>
                <Input
                  id="expiry"
                  type="datetime-local"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  onBlur={() => touch("expiryTime")}
                />
                <p className="text-xs text-muted-foreground">Moet vóór starttijd liggen</p>
                {showError("expiryTime") && <p className="text-xs text-destructive">{showError("expiryTime")}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 7: Checkout & Kortingscode */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Checkout & Kortingscode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!atCounter && (
              <div className="space-y-2">
                <Label htmlFor="checkout">Checkout link *</Label>
                <Input
                  id="checkout"
                  type="url"
                  value={checkoutLink}
                  onChange={(e) => setCheckoutLink(e.target.value)}
                  onBlur={() => touch("checkoutLink")}
                  placeholder="https://jouwwebsite.nl/tickets/..."
                />
                <p className="text-xs text-muted-foreground">De link waar klanten hun tickets kunnen kopen</p>
                {showError("checkoutLink") && <p className="text-xs text-destructive">{showError("checkoutLink")}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Type kortingscode *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDiscountType("universal")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    discountType === "universal"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <p className="font-display font-semibold text-sm">Universele code</p>
                  <p className="text-xs text-muted-foreground mt-0.5">1 code voor alle klanten</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType("unique")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    discountType === "unique"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <p className="font-display font-semibold text-sm">Unieke codes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Elke klant krijgt eigen code</p>
                </button>
              </div>
            </div>

            {discountType === "universal" ? (
              <div className="space-y-2">
                <Label htmlFor="universalCode">Kortingscode *</Label>
                <Input
                  id="universalCode"
                  value={universalCode}
                  onChange={(e) => setUniversalCode(e.target.value)}
                  onBlur={() => touch("universalCode")}
                />
                <p className="text-xs text-muted-foreground">
                  Zorg dat deze code actief is in je eigen systeem. Dezelfde code kan door meerdere klanten gebruikt worden.
                </p>
                {showError("universalCode") && <p className="text-xs text-destructive">{showError("universalCode")}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="codeCount">Aantal unieke codes *</Label>
                  <Input
                    id="codeCount"
                    type="number"
                    min="1"
                    value={uniqueCodeCount}
                    onChange={(e) => setUniqueCodeCount(e.target.value)}
                    onBlur={() => touch("uniqueCodeCount")}
                  />
                  {showError("uniqueCodeCount") && <p className="text-xs text-destructive">{showError("uniqueCodeCount")}</p>}
                </div>
                {parseInt(uniqueCodeCount) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="codes">Plak unieke codes (1 per regel)</Label>
                      <span className={`text-xs font-medium ${
                        parsedUniqueCodes.length === parseInt(uniqueCodeCount)
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}>
                        {parsedUniqueCodes.length}/{uniqueCodeCount} codes
                      </span>
                    </div>
                    <Textarea
                      id="codes"
                      value={uniqueCodesText}
                      onChange={(e) => setUniqueCodesText(e.target.value)}
                      onBlur={() => touch("uniqueCodes")}
                      rows={6}
                      placeholder={"CODE1\nCODE2\nCODE3"}
                    />
                    <p className="text-xs text-muted-foreground">
                      Elke klant krijgt één eigen code. Zorg dat alle codes actief zijn in je eigen systeem.
                    </p>
                    {showError("uniqueCodes") && <p className="text-xs text-destructive">{showError("uniqueCodes")}</p>}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spacer for fixed button */}
        <div className="h-4" />
      </form>

      {/* Fixed submit button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
        <div className="container max-w-lg">
          <Button
            onClick={handleSubmit as any}
            className="w-full h-12 text-base font-display font-semibold"
            disabled={saving}
          >
            {saving
              ? "Opslaan..."
              : isEdit
              ? "Advertentie bijwerken →"
              : "Advertentie plaatsen →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
