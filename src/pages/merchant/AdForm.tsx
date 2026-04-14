import { useState, useEffect, useMemo } from "react";

/** Convert an ISO/UTC timestamp to a `datetime-local` value in the browser's local timezone */
function toLocalDatetimeString(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
import { useNavigate, useParams, Navigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const copyFromId = searchParams.get("copyFrom");
  const isEdit = !!id;
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [redemptionMethod, setRedemptionMethod] = useState<"online_checkout" | "at_counter" | "online_pay_pos_refund">("online_checkout");
  const [counterDiscountMode, setCounterDiscountMode] = useState<"fixed_price" | "variable_amount">("fixed_price");
  const [pricingModel, setPricingModel] = useState<"fixed" | "per_person_variable">("fixed");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [startTimeMode, setStartTimeMode] = useState<"fixed" | "flexible">("fixed");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VenueCategory | "">("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
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
  const DEFAULT_REDEMPTION_INSTRUCTIONS = "Je ontvangt na claimen een kortingscode. Gebruik deze op de betaalpagina van de aanbieder, of toon je voucher als dat bij deze deal geldt.";
  const DEFAULT_CANCELLATION_POLICY = "Annuleren en wijzigingen lopen via de aanbieder. Last-minute deals kunnen beperkingen hebben.";
  const DEFAULT_TERMS_SUMMARY = "Door deze deal te claimen ga je akkoord met de voorwaarden van Last Ones Left en de aanbieder.";
  const [redemptionInstructions, setRedemptionInstructions] = useState(DEFAULT_REDEMPTION_INSTRUCTIONS);
  const [cancellationPolicy, setCancellationPolicy] = useState(DEFAULT_CANCELLATION_POLICY);
  const [termsSummary, setTermsSummary] = useState(DEFAULT_TERMS_SUMMARY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [wasExpired, setWasExpired] = useState(false);

  // Load existing deal for edit OR copy
  const loadDealId = isEdit ? id : copyFromId;
  useEffect(() => {
    if (loadDealId) {
      supabase
        .from("deals")
        .select("*")
        .eq("id", loadDealId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setTitle(data.title);
            setDescription(data.description);
            setCategory(data.category);
            setCity(data.city);
            setPostalCode((data as any).postal_code || "");
            setAddress((data as any).address || "");
            setOriginalPrice(String(data.original_price));
            setDiscountPercentage(String(data.discount_percentage));
            setStartTimeMode(((data as any).start_time_mode as "fixed" | "flexible") || "fixed");
            if (isEdit && data.start_time) {
              setStartTime(toLocalDatetimeString(data.start_time));
            }
            if (isEdit) {
              setExpiryTime(toLocalDatetimeString(data.expiry_time));
            }
            setCheckoutLink(data.checkout_link);
            setExistingImageUrl(data.image_url);
            setRedemptionMethod(((data as any).redemption_method as "online_checkout" | "at_counter" | "online_pay_pos_refund") || "online_checkout");
            setCounterDiscountMode(((data as any).counter_discount_mode as "fixed_price" | "variable_amount") || "fixed_price");
            setPricingModel(((data as any).pricing_model as "fixed" | "per_person_variable") || "fixed");
            setPricePerPerson((data as any).price_per_person ? String((data as any).price_per_person) : ((data as any).indicative_price_from ? String((data as any).indicative_price_from) : ""));
            setDiscountType(((data as any).discount_type as "universal" | "unique") || "universal");
            setRedemptionInstructions((data as any).redemption_instructions || "");
            setCancellationPolicy((data as any).cancellation_policy || "");
            setTermsSummary((data as any).terms_summary || "");
            if ((data as any).discount_type !== "unique") {
              setUniversalCode(data.discount_code);
            }
            // Track if the deal was expired when editing started
            if (isEdit) {
              setWasExpired(new Date(data.expiry_time) < new Date());
            }
          }
        });

      // Load unique codes only for edit (not copy — new codes needed)
      if (isEdit) {
        supabase
          .from("unique_codes" as any)
          .select("code")
          .eq("deal_id", loadDealId)
          .then(({ data }: any) => {
            if (data && data.length > 0) {
              setDiscountType("unique");
              setUniqueCodeCount(String(data.length));
              setUniqueCodesText(data.map((c: any) => c.code).join("\n"));
            }
          });
      } else if (copyFromId) {
        // For copies with unique codes, keep the type but clear the codes
        // The discount_type is already set above from the deal data
      }
    }
    if (merchant?.city && !isEdit && !copyFromId) {
      setCity(merchant.city);
      setPostalCode(merchant.postcode || "");
      setAddress(merchant.address);
    }
  }, [isEdit, loadDealId, merchant, copyFromId]);

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

  const discountedPricePerPerson = useMemo(() => {
    const price = parseFloat(pricePerPerson);
    const disc = parseInt(discountPercentage);
    if (isNaN(price) || isNaN(disc) || price <= 0 || disc < 1 || disc > 100) return null;
    return (price * (1 - disc / 100)).toFixed(2);
  }, [pricePerPerson, discountPercentage]);

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
    if (!postalCode.trim()) {
      e.postalCode = "Postcode is verplicht";
    } else {
      const normalized = postalCode.trim().replace(/\s+/g, "").toUpperCase();
      if (!/^\d{4}[A-Z]{2}$/.test(normalized)) {
        e.postalCode = "Vul een geldige Nederlandse postcode in (bijv. 1234 AB)";
      }
    }
    if (!address.trim()) e.address = "Adres is verplicht";

    const isVariableAmount = redemptionMethod === "at_counter" && counterDiscountMode === "variable_amount";
    const isPerPersonVariable = pricingModel === "per_person_variable";
    if (!isVariableAmount && !isPerPersonVariable) {
      const price = parseFloat(originalPrice);
      if (isNaN(price) || price < 0.01) e.originalPrice = "Prijs moet minimaal €0,01 zijn";
    }
    if (isPerPersonVariable) {
      const pp = parseFloat(pricePerPerson);
      if (isNaN(pp) || pp < 0.01) e.pricePerPerson = "Prijs per persoon moet minimaal €0,01 zijn";
    }
    const disc = parseInt(discountPercentage);
    if (isNaN(disc) || disc < 1 || disc > 100) e.discountPercentage = "Korting moet tussen 1 en 100 zijn";

    const now = new Date();
    const expiry = new Date(expiryTime);

    if (startTimeMode === "fixed") {
      const start = new Date(startTime);
      if (!startTime) {
        e.startTime = "Starttijd is verplicht";
      } else if (start.getTime() < now.getTime() + 5 * 60 * 1000) {
        e.startTime = "Starttijd moet minimaal 5 minuten in de toekomst liggen";
      } else {
        // End of tomorrow: midnight at the end of the next calendar day
        const endOfTomorrow = new Date(now);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
        endOfTomorrow.setHours(0, 0, 0, 0);
        if (start.getTime() > endOfTomorrow.getTime()) {
          e.startTime = "Starttijd moet vandaag of morgen zijn";
        }
      }

      if (!expiryTime) {
        e.expiryTime = "Verwijdertijd is verplicht";
      } else if (expiry <= now) {
        e.expiryTime = "Verwijdertijd moet in de toekomst liggen";
      } else if (startTime && expiry > new Date(startTime)) {
        e.expiryTime = "Verwijdertijd moet vóór de starttijd liggen";
      }
    } else {
      // flexible mode
      if (!expiryTime) {
        e.expiryTime = "Verwijdertijd is verplicht";
      } else if (expiry <= now) {
        e.expiryTime = "Verwijdertijd moet in de toekomst liggen";
      }
    }

    // Checkout link required for online_checkout and online_pay_pos_refund, optional for at_counter
    const checkoutRequired = redemptionMethod !== "at_counter";
    if (checkoutRequired) {
      if (!checkoutLink.trim()) e.checkoutLink = "Checkout link is verplicht";
      else {
        try {
          new URL(checkoutLink);
        } catch {
          e.checkoutLink = "Voer een geldige URL in";
        }
      }
    } else if (checkoutLink.trim()) {
      try {
        new URL(checkoutLink);
      } catch {
        e.checkoutLink = "Voer een geldige URL in";
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
      postal_code: (() => { const n = postalCode.trim().replace(/\s+/g, "").toUpperCase(); return n.slice(0, 4) + " " + n.slice(4); })(),
      address: address.trim(),
      original_price: (redemptionMethod === "at_counter" && counterDiscountMode === "variable_amount") || pricingModel === "per_person_variable" ? 0 : parseFloat(originalPrice),
      counter_discount_mode: redemptionMethod === "at_counter" ? counterDiscountMode : "fixed_price",
      pricing_model: pricingModel,
      indicative_price_from: pricingModel === "per_person_variable" && pricePerPerson ? parseFloat(pricePerPerson) : null,
      price_per_person: pricingModel === "per_person_variable" && pricePerPerson ? parseFloat(pricePerPerson) : null,
      discount_percentage: parseInt(discountPercentage),
      start_time: startTimeMode === "fixed" ? new Date(startTime).toISOString() : null,
      expiry_time: new Date(expiryTime).toISOString(),
      start_time_mode: startTimeMode,
      checkout_link: checkoutLink.trim(),
      discount_code: discountType === "universal" ? universalCode.trim() : "",
      image_url: imageUrl,
      redemption_method: redemptionMethod,
      discount_type: discountType,
      redemption_instructions: redemptionInstructions.trim(),
      cancellation_policy: cancellationPolicy.trim(),
      terms_summary: termsSummary.trim(),
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

    // Reset stats only when reactivating an expired deal
    if (isEdit && dealId && wasExpired) {
      await supabase.from("deal_events").delete().eq("deal_id", dealId);
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
                {isEdit ? "Advertentie bewerken" : copyFromId ? "Advertentie kopiëren" : "Advertentie maken"}
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
        {startTimeMode === "fixed" && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-semibold text-sm">Let op: Starttijd moet vandaag of morgen zijn</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dit is een last-minute marketplace. Activiteiten die later starten kunnen niet worden geplaatst.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 1: Korting verzilveren */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Hoe wordt de korting verzilverd?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setRedemptionMethod("online_checkout")}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  redemptionMethod === "online_checkout"
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/30"
                }`}
              >
                <p className="font-display font-semibold text-sm">Online afrekenen met kortingscode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klant gebruikt de kortingscode op jouw betaalpagina.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRedemptionMethod("online_pay_pos_refund")}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  redemptionMethod === "online_pay_pos_refund"
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/30"
                }`}
              >
                <p className="font-display font-semibold text-sm">Online afrekenen zonder kortingscode, korting aan kassa terug</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klanten betalen online het volledige bedrag. Op locatie tonen ze de kortingscode en krijgen ze de korting terug/verrekend.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRedemptionMethod("at_counter")}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  redemptionMethod === "at_counter"
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/30"
                }`}
              >
                <p className="font-display font-semibold text-sm">Online reserveren - afrekenen op locatie - korting aan kassa terug</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Klant hoeft online niet te betalen, maar betaalt pas op locatie. Op locatie tonen ze de kortingscode en krijgen ze de korting terug/verrekend.
                </p>
              </button>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Stad *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => touch("city")}
                  placeholder="Bijv. Meppel"
                />
                {showError("city") && <p className="text-xs text-destructive">{showError("city")}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postcode *</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  onBlur={() => touch("postalCode")}
                  placeholder="Bijv. 1234 AB"
                />
                {showError("postalCode") && <p className="text-xs text-destructive">{showError("postalCode")}</p>}
                <p className="text-xs text-muted-foreground">Vul een Nederlandse postcode in (1234 AB).</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres (straat + huisnummer) *</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => touch("address")}
                placeholder="Bijv. Kruisstraat 20-01"
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
            {/* Pricing model selection */}
            <div className="space-y-2">
              <Label>Prijsmodel *</Label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setPricingModel("fixed")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    pricingModel === "fixed"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <p className="font-display font-semibold text-sm">Vaste prijs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Je geeft 1 prijs op voor dit aanbod.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPricingModel("per_person_variable")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    pricingModel === "per_person_variable"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <p className="font-display font-semibold text-sm">Prijs afhankelijk van aantal personen</p>
                  <p className="text-xs text-muted-foreground mt-0.5">De klant kiest het aantal personen in je checkout. De prijs wordt daar berekend.</p>
                </button>
              </div>
            </div>

            {redemptionMethod === "at_counter" && pricingModel === "fixed" && (
              <div className="space-y-2">
                <Label>Prijstype *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCounterDiscountMode("fixed_price")}
                    className={`rounded-lg border-2 p-4 text-left transition-colors ${
                      counterDiscountMode === "fixed_price"
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/30"
                    }`}
                  >
                    <p className="font-display font-semibold text-sm">Prijs bekend</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Vul een vaste prijs in + korting</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCounterDiscountMode("variable_amount")}
                    className={`rounded-lg border-2 p-4 text-left transition-colors ${
                      counterDiscountMode === "variable_amount"
                        ? "border-primary bg-primary/5"
                        : "border-input hover:border-primary/30"
                    }`}
                  >
                    <p className="font-display font-semibold text-sm">Bedrag varieert</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Alleen korting (%), bedrag verschilt per klant</p>
                  </button>
                </div>
              </div>
            )}

            {pricingModel === "per_person_variable" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pricePerPerson">Normale prijs per persoon (€) *</Label>
                  <Input
                    id="pricePerPerson"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={pricePerPerson}
                    onChange={(e) => setPricePerPerson(e.target.value)}
                    onBlur={() => touch("pricePerPerson")}
                    placeholder="Bijv. 25.00"
                  />
                  <p className="text-xs text-muted-foreground">Dit is de normale prijs per persoon. De definitieve totaalprijs wordt in je checkout berekend op basis van het aantal personen.</p>
                  {showError("pricePerPerson") && <p className="text-xs text-destructive">{showError("pricePerPerson")}</p>}
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
                {discountedPricePerPerson && (
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">Prijs per persoon na korting:</p>
                    <p className="font-display text-xl font-bold">€{discountedPricePerPerson} p.p.</p>
                  </div>
                )}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Let op:</span> Toon op je reserveringspagina duidelijk de korting en zorg dat staff weet hoe korting wordt toegepast.
                  </p>
                </div>
              </>
            ) : (
              <>
                {!(redemptionMethod === "at_counter" && counterDiscountMode === "variable_amount") && (
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
                )}

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

                {redemptionMethod === "at_counter" && counterDiscountMode === "variable_amount" && discountPercentage && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm text-muted-foreground">
                      Let op: Het bedrag aan de kassa kan per klant verschillen. Klanten krijgen <span className="font-semibold text-foreground">{discountPercentage}%</span> korting op de uiteindelijke kassabon.
                    </p>
                  </div>
                )}

                {!(redemptionMethod === "at_counter" && counterDiscountMode === "variable_amount") && discountedPrice && (
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">Prijs na korting:</p>
                    <p className="font-display text-xl font-bold">€{discountedPrice}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Timing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Start time mode selection */}
            <div className="space-y-2">
              <Label>Starttijd activiteit *</Label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => { setStartTimeMode("fixed"); }}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    startTimeMode === "fixed"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <p className="font-display font-semibold text-sm">Starttijd bekend</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Je weet wanneer de activiteit begint.</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTimeMode("flexible"); setStartTime(""); }}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    startTimeMode === "flexible"
                      ? "border-primary bg-primary/5"
                      : "border-input hover:border-primary/30"
                  }`}
                >
                  <p className="font-display font-semibold text-sm">Starttijd onbekend (keuze op reserveringspagina)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">De klant kiest zelf een tijd op jouw reserveringspagina.</p>
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${startTimeMode === "fixed" ? "sm:grid-cols-2" : ""} gap-4`}>
              {startTimeMode === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="start">Starttijd activiteit *</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    onBlur={() => touch("startTime")}
                  />
                  <p className="text-xs text-muted-foreground">Moet vandaag of morgen zijn</p>
                  {showError("startTime") && <p className="text-xs text-destructive">{showError("startTime")}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="expiry">Advertentie verwijderen om *</Label>
                <Input
                  id="expiry"
                  type="datetime-local"
                  value={expiryTime}
                  onChange={(e) => setExpiryTime(e.target.value)}
                  onBlur={() => touch("expiryTime")}
                />
                <p className="text-xs text-muted-foreground">
                  {startTimeMode === "fixed" ? "Moet vóór starttijd liggen" : "Moet in de toekomst liggen"}
                </p>
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
            <div className="space-y-2">
              <Label htmlFor="checkout">Checkout link {redemptionMethod === "at_counter" ? "(optioneel)" : "*"}</Label>
              <Input
                id="checkout"
                type="url"
                value={checkoutLink}
                onChange={(e) => setCheckoutLink(e.target.value)}
                onBlur={() => touch("checkoutLink")}
                placeholder="https://jouwwebsite.nl/tickets/..."
              />
              <p className="text-xs text-muted-foreground">
                {redemptionMethod === "at_counter"
                  ? "Optioneel: Voeg een link toe waar klanten hun ticket(s) kunnen kopen of reserveren. De korting wordt aan de kassa toegepast."
                  : redemptionMethod === "online_pay_pos_refund"
                  ? "Klanten reserveren/betalen hier online het volledige bedrag. De kortingscode wordt op locatie getoond."
                  : "De link waar klanten hun tickets kunnen kopen"}
              </p>
              {showError("checkoutLink") && <p className="text-xs text-destructive">{showError("checkoutLink")}</p>}
            </div>

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

            {/* Dynamische kortingscode-waarschuwing */}
            <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 space-y-2">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-yellow-800">
                  Let op: Koppel de kortingscode(s) in je eigen systeem aan deze deal en stel in dat ze maximaal 24 uur geldig zijn om misbruik te voorkomen.
                </p>
              </div>
              <div className="ml-7 space-y-1 text-sm">
                <p>
                  <span className="font-semibold text-yellow-800">Uiterlijk laten verlopen op:</span>{" "}
                  {expiryTime ? (
                    <span className="text-yellow-700">
                      {new Date(expiryTime).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}
                    </span>
                  ) : (
                    <span className="text-yellow-600 italic">Vul eerst 'Advertentie verwijderen om' in</span>
                  )}
                </p>
                <p>
                  <span className="font-semibold text-yellow-800">Starttijd activiteit:</span>{" "}
                  {startTimeMode === "flexible" ? (
                    <span className="text-yellow-700">Flexibel (klant kiest op reserveringspagina)</span>
                  ) : startTime ? (
                    <span className="text-yellow-700">
                      {new Date(startTime).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}
                    </span>
                  ) : (
                    <span className="text-yellow-600 italic">Vul eerst 'Starttijd activiteit' in</span>
                  )}
                </p>
                {startTimeMode === "fixed" && expiryTime && startTime && new Date(expiryTime) > new Date(startTime) && (
                  <p className="text-destructive text-xs font-medium mt-1">
                    ⚠ Let op: 'Advertentie verwijderen om' moet vóór de starttijd liggen.
                  </p>
                )}
              </div>
              <p className="ml-7 text-xs text-yellow-600">
                Tip: laat de codes automatisch verlopen bij 'Advertentie verwijderen om'.
              </p>
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

        {/* Section 8: Kleine lettertjes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg">Kleine lettertjes (optioneel)</CardTitle>
            <p className="text-xs text-muted-foreground">Houd het kort en duidelijk. Dit zien klanten op de dealpagina.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="redemptionInstructions">Inwisselinstructies</Label>
              <Textarea
                id="redemptionInstructions"
                value={redemptionInstructions}
                onChange={(e) => setRedemptionInstructions(e.target.value)}
                rows={2}
                placeholder="Bijv. 'Gebruik de kortingscode tijdens het online afrekenen.'"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancellationPolicy">Annuleringsbeleid</Label>
              <Textarea
                id="cancellationPolicy"
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                rows={2}
                placeholder="Bijv. 'Annuleren is niet mogelijk na aankoop.'"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termsSummary">Algemene voorwaarden</Label>
              <Textarea
                id="termsSummary"
                value={termsSummary}
                onChange={(e) => setTermsSummary(e.target.value)}
                rows={2}
                placeholder="Bijv. 'Geldig voor 1 persoon, niet combineerbaar met andere acties.'"
              />
            </div>
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
