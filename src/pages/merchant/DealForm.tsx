import { useState, useEffect } from "react";

/** Convert an ISO/UTC timestamp to a `datetime-local` value in the browser's local timezone */
function toLocalDatetimeString(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type VenueCategory = Database["public"]["Enums"]["venue_category"];

export default function DealForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id && id !== "nieuw";
  const { user, merchant, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<VenueCategory>("overig");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [checkoutLink, setCheckoutLink] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
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
            setPostalCode((data as any).postal_code || "");
            setOriginalPrice(String(data.original_price));
            setDiscountPercentage(String(data.discount_percentage));
            setStartTime(toLocalDatetimeString(data.start_time));
            setExpiryTime(toLocalDatetimeString(data.expiry_time));
            setCheckoutLink(data.checkout_link);
            setDiscountCode(data.discount_code);
            setExistingImageUrl(data.image_url);
          }
        });
    }
    // Pre-fill city from merchant
    if (merchant?.city && !isEdit) {
      setCity(merchant.city);
    }
  }, [isEdit, id, merchant]);

  if (!authLoading && (!user || !roles.includes("merchant"))) {
    return <Navigate to="/login" />;
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return existingImageUrl;
    const ext = imageFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("deal-images").upload(path, imageFile);
    if (error) {
      toast({ title: "Upload mislukt", description: error.message, variant: "destructive" });
      return existingImageUrl;
    }
    const { data } = supabase.storage.from("deal-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    setSaving(true);

    const imageUrl = await uploadImage();

    const dealData = {
      merchant_id: merchant.id,
      title,
      description,
      category,
      city,
      postal_code: (() => { const n = postalCode.trim().replace(/\s+/g, "").toUpperCase(); return n.length === 6 ? n.slice(0, 4) + " " + n.slice(4) : n; })(),
      original_price: parseFloat(originalPrice),
      discount_percentage: parseInt(discountPercentage),
      start_time: new Date(startTime).toISOString(),
      expiry_time: new Date(expiryTime).toISOString(),
      checkout_link: checkoutLink,
      discount_code: discountCode,
      image_url: imageUrl,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase.from("deals").update(dealData).eq("id", id));
    } else {
      ({ error } = await supabase.from("deals").insert(dealData));
    }

    if (error) {
      toast({ title: "Fout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isEdit ? "Deal bijgewerkt!" : "Deal geplaatst!" });
      navigate("/merchant");
    }
    setSaving(false);
  };

  return (
    <div className="container py-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {isEdit ? "Deal bewerken" : "Nieuwe deal plaatsen"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Beschrijving</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Afbeelding</Label>
              <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              {existingImageUrl && !imageFile && (
                <img src={existingImageUrl} alt="Huidige afbeelding" className="h-24 rounded-md object-cover" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as VenueCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Stad</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postcode</Label>
                <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1234 AB" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Originele prijs (€)</Label>
                <Input id="price" type="number" step="0.01" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Korting (%)</Label>
                <Input id="discount" type="number" min="1" max="100" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start">Starttijd</Label>
                <Input id="start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Verlooptijd</Label>
                <Input id="expiry" type="datetime-local" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkout">Checkout link</Label>
              <Input id="checkout" type="url" value={checkoutLink} onChange={(e) => setCheckoutLink(e.target.value)} placeholder="https://..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Kortingscode</Label>
              <Input id="code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Opslaan..." : isEdit ? "Bijwerken" : "Deal plaatsen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
