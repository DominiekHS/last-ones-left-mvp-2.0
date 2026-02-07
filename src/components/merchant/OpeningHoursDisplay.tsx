const DAYS = [
  { key: "ma", label: "Maandag" },
  { key: "di", label: "Dinsdag" },
  { key: "wo", label: "Woensdag" },
  { key: "do", label: "Donderdag" },
  { key: "vr", label: "Vrijdag" },
  { key: "za", label: "Zaterdag" },
  { key: "zo", label: "Zondag" },
] as const;

interface DayHours {
  closed?: boolean;
  open?: string;
  close?: string;
}

interface OpeningHoursDisplayProps {
  hours: Record<string, DayHours> | null | undefined;
}

export function OpeningHoursDisplay({ hours }: OpeningHoursDisplayProps) {
  if (!hours || Object.keys(hours).length === 0) {
    return <p className="text-sm text-muted-foreground">Openingstijden niet ingevuld.</p>;
  }

  return (
    <div className="space-y-1">
      {DAYS.map(({ key, label }) => {
        const day = hours[key] as DayHours | undefined;
        const isClosed = !day || day.closed;
        return (
          <div key={key} className="flex justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="text-muted-foreground">
              {isClosed ? "Gesloten" : `${day?.open || "?"} – ${day?.close || "?"}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
