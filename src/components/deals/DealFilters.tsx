import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/constants";
import { useCities } from "@/hooks/useCities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface DealFiltersProps {
  category: string;
  city: string;
  onCategoryChange: (v: string) => void;
  onCityChange: (v: string) => void;
}

export function DealFilters({ category, city, onCategoryChange, onCityChange }: DealFiltersProps) {
  const { data: cities = [], isLoading: citiesLoading } = useCities();
  const [open, setOpen] = useState(false);

  const selectedLabel = city
    ? cities.find((c) => c.value === city)?.label || city
    : "Alle steden";

  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur border-b py-3">
      <div className="container flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 min-w-[180px] justify-between"
            >
              <span className="flex items-center gap-1.5 truncate">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                {selectedLabel}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
            <Command>
              <CommandInput placeholder="Zoek een stad…" />
              <CommandList>
                <CommandEmpty>Geen steden gevonden</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="alle-steden"
                    onSelect={() => {
                      onCityChange("");
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", !city ? "opacity-100" : "opacity-0")} />
                    Alle steden
                  </CommandItem>
                  {cities.map((c) => (
                    <CommandItem
                      key={c.value}
                      value={c.value}
                      onSelect={() => {
                        onCityChange(c.value);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", city === c.value ? "opacity-100" : "opacity-0")} />
                      {c.label} ({c.count})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
