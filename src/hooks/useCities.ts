import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CityOption {
  label: string;
  value: string;
  count: number;
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function normalizeCity(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Title-case with Dutch exceptions preserved, also handles hyphens (e.g. Velsen-Zuid)
  return trimmed
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      // Keep Dutch prefixes lowercase when not first word
      if (i > 0 && ["de", "den", "het", "van", "aan", "op", "in", "ter", "ten"].includes(word)) {
        return word;
      }
      // Capitalize each part of hyphenated words
      return word.split("-").map(capitalizeWord).join("-");
    })
    .join(" ");
}

export function useCities() {
  return useQuery<CityOption[]>({
    queryKey: ["cities", "active"],
    queryFn: async () => {
      // Publieke query → via view zodat anon nooit de base table raakt.
      const { data, error } = await supabase
        .from("deals_public" as any)
        .select("city")
        .gt("expiry_time", new Date().toISOString());

      if (error) throw error;

      // Normalize, deduplicate & count
      const counts = new Map<string, number>();
      for (const row of (data as any[]) || []) {
        if (!row.city?.trim()) continue;
        const normalized = normalizeCity(row.city);
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }

      return Array.from(counts.entries())
        .map(([label, count]) => ({ label, value: label, count }))
        .sort((a, b) => a.label.localeCompare(b.label, "nl"));
    },
    staleTime: 60_000,
  });
}
