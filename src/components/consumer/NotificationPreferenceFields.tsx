import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNotificationChoices } from "@/hooks/useNotificationChoices";
import { cn } from "@/lib/utils";
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

const MODE_OPTIONS: { value: NotificationChoice; label: string; description: string; recommended?: boolean }[] = [
  {
    value: "personal",
    label: "Alleen deals die bij mij passen",
    description: "Ontvang aanbiedingen op basis van je favoriete activiteiten en bedrijven.",
    recommended: true,
  },
  {
    value: "all",
    label: "Alle deals ontvangen",
    description: "Ontvang alle nieuwe deals en mis geen enkele aanbieding.",
  },
  {
    value: "off",
    label: "Geen meldingsmails ontvangen",
    description: "Je ontvangt geen e-mails over nieuwe deals.",
  },
];

export function NotificationPreferenceFields({ choice, categories, merchants, onChoice, onCategories, onMerchants, registration = false, disabled = false }: Props) {
  const { data: available = [], isPending, isError } = useNotificationChoices();
  const options = registration ? MODE_OPTIONS : MODE_OPTIONS.filter(o => o.value !== "off");
  return <div className="space-y-4">
    <div className="space-y-1">
      <p className="font-display text-lg font-bold text-foreground">Welke deals wil jij ontvangen?{registration && <span aria-hidden="true"> *</span>}</p>
      <p className="text-sm text-muted-foreground">Ontvang nieuwe aanbiedingen in je mailbox. Kies wat bij jou past.</p>
    </div>
    <RadioGroup value={choice} onValueChange={v => onChoice(v as NotificationChoice)} disabled={disabled} aria-label="Meldingsvoorkeur" className="gap-2">
      {options.map(o => <Label
        key={o.value}
        htmlFor={`notification-${o.value}`}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-xl p-4 transition-colors",
          o.recommended
            ? "border-2 border-primary bg-recommended"
            : "border border-border bg-card hover:border-muted-foreground/40",
          choice === o.value && "ring-1 ring-primary",
        )}
      >
        <RadioGroupItem value={o.value} id={`notification-${o.value}`} className="mt-1 shrink-0" />
        <span className="min-w-0">
          {o.recommended && <span className="mb-1.5 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Aanbevolen</span>}
          <span className="block font-semibold leading-5 text-foreground">{o.label}</span>
          <span className="block text-sm leading-5 text-muted-foreground">{o.description}</span>
        </span>
      </Label>)}
    </RadioGroup>
    {registration && <p className="text-xs text-muted-foreground">Je kunt je voorkeuren later altijd aanpassen in je profiel.</p>}
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
