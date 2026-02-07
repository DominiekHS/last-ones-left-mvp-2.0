import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const DAYS = [
  { key: "ma", label: "Ma" },
  { key: "di", label: "Di" },
  { key: "wo", label: "Wo" },
  { key: "do", label: "Do" },
  { key: "vr", label: "Vr" },
  { key: "za", label: "Za" },
  { key: "zo", label: "Zo" },
] as const;

export interface DayHours {
  closed?: boolean;
  open?: string;
  close?: string;
}

export type OpeningHours = Record<string, DayHours>;

interface OpeningHoursEditorProps {
  value: OpeningHours;
  onChange: (hours: OpeningHours) => void;
}

export function OpeningHoursEditor({ value, onChange }: OpeningHoursEditorProps) {
  const updateDay = (key: string, updates: Partial<DayHours>) => {
    onChange({ ...value, [key]: { ...(value[key] || {}), ...updates } });
  };

  return (
    <div className="space-y-3">
      {DAYS.map(({ key, label }) => {
        const day = value[key] || { closed: true };
        const isClosed = day.closed !== false;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-8 text-sm font-medium">{label}</span>
            <div className="flex items-center gap-1.5">
              <Switch
                checked={!isClosed}
                onCheckedChange={(open) => updateDay(key, { closed: !open })}
              />
              <Label className="text-xs text-muted-foreground w-14">
                {isClosed ? "Gesloten" : "Open"}
              </Label>
            </div>
            {!isClosed && (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  type="time"
                  value={day.open || "09:00"}
                  onChange={(e) => updateDay(key, { open: e.target.value })}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs">–</span>
                <Input
                  type="time"
                  value={day.close || "17:00"}
                  onChange={(e) => updateDay(key, { close: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
