import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNotificationChoices } from "@/hooks/useNotificationChoices";
import type { NotificationChoice } from "@/lib/notification-preferences";

interface Props {
  choice: NotificationChoice | "";
  categories: string[];
  merchants: string[];
  onChoice: (value: NotificationChoice) => void;
  onCategories: (values: string[]) => void;
  onMerchants: (values: string[]) => void;
  registration?: boolean;
  disabled?: boolean;
}

export function NotificationPreferenceFields({ choice, categories, merchants, onChoice, onCategories, onMerchants, registration = false, disabled = false }: Props) {
  const { data: available = [], isPending, isError } = useNotificationChoices();
  const options = registration
    ? [{ value: "all", label: "Alle deals ontvangen" }, { value: "personal", label: "Alleen deals die bij mij passen" }, { value: "off", label: "Geen meldingsmails ontvangen" }]
    : [{ value: "all", label: "Alle deals ontvangen" }, { value: "personal", label: "Alleen deals die bij mij passen" }];
  return <div className="space-y-4">
    <RadioGroup value={choice} onValueChange={v => onChoice(v as NotificationChoice)} disabled={disabled} aria-label="Meldingsvoorkeur" className="gap-3">
      {options.map(o => <div key={o.value} className="flex items-start gap-2">
        <RadioGroupItem value={o.value} id={`notification-${o.value}`} className="mt-0.5 shrink-0" />
        <Label htmlFor={`notification-${o.value}`} className="leading-5 cursor-pointer">{o.label}</Label>
      </div>)}
    </RadioGroup>
    {choice === "personal" && <div className="space-y-4">
      {isPending && <p className="text-sm text-muted-foreground">Keuzes laden…</p>}
      {isError && <p role="alert" className="text-sm text-destructive">De keuzes konden niet worden geladen. Probeer het opnieuw.</p>}
      {!isPending && !isError && ["category", "merchant"].map(kind => {
        const rows = available.filter(c => c.kind === kind);
        const selected = kind === "category" ? categories : merchants;
        const onChange = kind === "category" ? onCategories : onMerchants;
        return <fieldset key={kind} disabled={disabled} className="space-y-2">
          <legend className="font-semibold text-sm mb-2">{kind === "category" ? "Activiteiten" : "Bedrijven"}</legend>
          {!rows.length && <p className="text-sm text-muted-foreground">Nog geen {kind === "category" ? "activiteiten" : "bedrijven"} beschikbaar.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.map(c => <div key={c.key} className="flex items-start gap-2 min-w-0">
              <Checkbox id={`pref-${kind}-${c.key}`} checked={selected.includes(c.key)} disabled={disabled} onCheckedChange={checked => onChange(checked ? [...selected, c.key] : selected.filter(v => v !== c.key))} className="mt-0.5 shrink-0" />
              <Label htmlFor={`pref-${kind}-${c.key}`} className="leading-5 cursor-pointer break-words min-w-0">{c.label}</Label>
            </div>)}
          </div>
          {selected.some(key => !rows.some(c => c.key === key)) && <p className="text-xs text-muted-foreground">Eerdere keuzes die tijdelijk niet beschikbaar zijn, blijven bewaard.</p>}
        </fieldset>;
      })}
    </div>}
  </div>;
}