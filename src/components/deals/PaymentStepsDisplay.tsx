import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PaymentStep {
  text: string;
  image_url?: string;
  order: number;
}

interface Props {
  steps: PaymentStep[];
}

export default function PaymentStepsDisplay({ steps }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!steps || steps.length === 0) return null;

  const sorted = [...steps].sort((a, b) => a.order - b.order);

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-display font-semibold text-sm">📝 Zo reserveer/betaal je</h3>
          <div className="space-y-3">
            {sorted.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm leading-relaxed">{step.text}</p>
                  {step.image_url && (
                    <img
                      src={step.image_url}
                      alt={`Stap ${i + 1}`}
                      className="max-h-32 rounded-md cursor-pointer hover:opacity-90 transition-opacity border"
                      onClick={() => setLightboxUrl(step.image_url!)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Stap afbeelding" className="w-full rounded-md" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
