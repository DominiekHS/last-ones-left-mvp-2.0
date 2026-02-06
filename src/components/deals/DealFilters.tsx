import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/constants";
import { Search } from "lucide-react";

interface DealFiltersProps {
  category: string;
  city: string;
  onCategoryChange: (v: string) => void;
  onCityChange: (v: string) => void;
}

export function DealFilters({ category, city, onCategoryChange, onCityChange }: DealFiltersProps) {
  return (
    <div className="sticky top-14 z-40 bg-background/95 backdrop-blur border-b py-3">
      <div className="container flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op stad..."
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="pl-9"
          />
        </div>
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
