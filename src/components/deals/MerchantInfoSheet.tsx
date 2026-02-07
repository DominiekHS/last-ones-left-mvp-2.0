import { MapPin, Store, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MerchantData {
  company_name: string;
  address?: string;
  city?: string;
  description?: string;
}

interface MerchantInfoSheetProps {
  merchant: MerchantData;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-sm text-muted-foreground">
        {value || "Niet ingevuld"}
      </p>
    </div>
  );
}

export default function MerchantInfoSheet({ merchant }: MerchantInfoSheetProps) {
  const addressParts = [merchant.address, merchant.city].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors text-left">
          {merchant.company_name}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Over {merchant.company_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-2">
          <InfoRow label="📍 Adres" value={fullAddress} />
          <InfoRow label="📝 Over dit bedrijf" value={merchant.description} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
