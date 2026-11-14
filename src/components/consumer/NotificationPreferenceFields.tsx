import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Check } from "lucide-react";
import { useNotificationChoices } from "@/hooks/useNotificationChoices";
import { cn } from "@/lib/utils";
import type { NotificationChoice } from "@/lib/notification-preferences";

interface Props {
  choice: NotificationChoice | "";
  categories: string[];
  onChoice: (value: NotificationChoice) => void;
  onCategories: (values: string[]) => void;
  registration?: boolean;
  disabled?: boolean;
}

const MODE_OPTIONS: { value: NotificationChoice; label: string; description: string; recommended?: boolean }[] = [
  {
    value: "personal",
    label: "Alleen deals die bij mij passen",
    description: "Ontvang aanbiedingen op basis van je favoriete activiteiten.",
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

export function NotificationPreferenceFields({ choice, categories, onChoice, onCategories, registration = false, disabled = false }: Props) {
  const { data: available = [], isPending, isError } = useNotificationChoices();
  const options = registration ? MODE_OPTIONS : MODE_OPTIONS.filter(o => o.value !== "off");
  const rows = available.filter(c => c.kind === "category");
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
      {!isPending && !isError && <div className="space-y-2" role="group" aria-labelledby="pref-category-title">
        <div className="flex items-baseline justify-between gap-2">
          <p id="pref-category-title" className="font-semibold text-sm">Favoriete activiteiten</p>
          <span className="text-xs text-muted-foreground">{categories.length} geselecteerd</span>
        </div>
        {!rows.length && <p className="text-sm text-muted-foreground">Nog geen activiteiten beschikbaar.</p>}
        <div className="flex flex-wrap gap-2">
          {rows.map(c => {
            const isOn = categories.includes(c.key);
            return <button
              key={c.key}
              type="button"
              aria-pressed={isOn}
              disabled={disabled}
              onClick={() => onCategories(isOn ? categories.filter(v => v !== c.key) : [...categories, c.key])}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm leading-5 transition-colors",
                isOn
                  ? "border-primary bg-recommended font-semibold text-foreground ring-1 ring-primary"
                  : "border-border bg-card text-foreground hover:border-muted-foreground/40",
              )}
            >
              {isOn && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
              <span className="min-w-0 break-words">{c.label}</span>
            </button>;
          })}
        </div>
        {categories.some(key => !rows.some(c => c.key === key)) && <p className="text-xs text-muted-foreground">Eerdere keuzes die tijdelijk niet beschikbaar zijn, blijven bewaard.</p>}
      </div>}
    </div>}
  </div>;
}
