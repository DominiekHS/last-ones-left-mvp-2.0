import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/storage-uploads";
import { toast } from "@/hooks/use-toast";

export interface PaymentStep {
  text: string;
  image_url?: string;
  order: number;
}

interface Props {
  steps: PaymentStep[];
  onChange: (steps: PaymentStep[]) => void;
  dealId?: string;
  userId?: string;
}

const MAX_STEPS = 8;

const EXAMPLE_STEPS: PaymentStep[] = [
  { text: "Klik op de link hieronder om naar de reserveringspagina te gaan.", order: 1 },
  { text: "Selecteer het gewenste tijdstip en het aantal personen.", order: 2 },
  { text: "Vul je gegevens in en voer de kortingscode in bij het afrekenen.", order: 3 },
  { text: "Je ontvangt een bevestiging per e-mail. Neem deze mee naar de locatie.", order: 4 },
];

export default function PaymentStepsEditor({ steps, onChange, dealId, userId }: Props) {
  const [uploading, setUploading] = useState<number | null>(null);

  const addStep = () => {
    if (steps.length >= MAX_STEPS) return;
    onChange([...steps, { text: "", order: steps.length + 1 }]);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    onChange(updated);
  };

  const updateText = (index: number, text: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], text };
    onChange(updated);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!userId) return;
    setUploading(index);
    try {
      const { url } = await uploadImage({
        bucket: "deal-images",
        userId,
        file,
        subfolder: "payment-steps",
      });
      const updated = [...steps];
      updated[index] = { ...updated[index], image_url: url };
      onChange(updated);
    } catch (err) {
      toast({
        title: "Upload mislukt",
        description: err instanceof Error ? err.message : "Probeer opnieuw",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const removeImage = (index: number) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], image_url: undefined };
    onChange(updated);
  };

  const fillExamples = () => {
    onChange(EXAMPLE_STEPS);
  };

  return (
    <Card>
      <div className="p-6 pb-3">
        <h3 className="font-display text-lg font-semibold">Stappenplan betalen (optioneel)</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Leg stap voor stap uit hoe klanten kunnen reserveren/betalen. Dit wordt getoond op de dealpagina.
        </p>
      </div>
      <CardContent className="space-y-3">
        {steps.length === 0 && (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">Nog geen stappen toegevoegd.</p>
            <div className="flex gap-2 justify-center">
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="mr-1 h-4 w-4" />Stap toevoegen
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={fillExamples}>
                Voorbeeld invullen
              </Button>
            </div>
          </div>
        )}

        {steps.map((step, index) => (
          <div key={index} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm">Stap {index + 1}</Label>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(index, -1)} disabled={index === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(index)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Textarea
              value={step.text}
              onChange={(e) => updateText(index, e.target.value)}
              rows={2}
              placeholder="Bijv. Ga naar de link en klik op 'Reserveren'."
            />
            {step.text.length > 0 && step.text.length < 5 && (
              <p className="text-xs text-destructive">Minimaal 5 tekens per stap</p>
            )}

            {step.image_url ? (
              <div className="relative inline-block">
                <img src={step.image_url} alt={`Stap ${index + 1}`} className="max-h-24 rounded-md" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading === index}
                  onClick={() => document.getElementById(`step-img-${index}`)?.click()}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  {uploading === index ? "Uploaden..." : "Afbeelding (optioneel)"}
                </Button>
                <input
                  id={`step-img-${index}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(index, f);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        ))}

        {steps.length > 0 && steps.length < MAX_STEPS && (
          <Button type="button" variant="outline" size="sm" onClick={addStep} className="w-full">
            <Plus className="mr-1 h-4 w-4" />Stap toevoegen
          </Button>
        )}
        {steps.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">{steps.length}/{MAX_STEPS} stappen</p>
        )}
      </CardContent>
    </Card>
  );
}
