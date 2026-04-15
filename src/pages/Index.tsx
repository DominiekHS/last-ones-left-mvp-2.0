import { useState, useMemo } from "react";

import lolLogo from "@/assets/lol-logo.png";
import { useActiveDeals } from "@/hooks/useDeals";
import { DealCard } from "@/components/deals/DealCard";
import { DealFilters } from "@/components/deals/DealFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket } from "lucide-react";

function getAmsterdamDayBoundaries(offset: 0 | 1): [Date, Date] {
  const now = new Date();
  // Build a date string in Europe/Amsterdam timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const d = parts.find(p => p.type === "day")!.value;

  // Create date objects for the target day in Amsterdam time
  const base = new Date(`${y}-${m}-${d}T00:00:00`);
  base.setDate(base.getDate() + offset);

  // Convert Amsterdam local boundaries to UTC by formatting back
  const dayStr = base.toLocaleDateString("en-CA"); // YYYY-MM-DD
  // Use a trick: create Date from Amsterdam midnight
  const startLocal = new Date(new Date(`${dayStr}T00:00:00+00:00`).toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  
  // Simpler approach: calculate offset from Amsterdam timezone
  const jan = new Date(`${y}-01-01T12:00:00Z`);
  const jul = new Date(`${y}-07-01T12:00:00Z`);
  const janOffset = new Date(jan.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" })).getTime() - jan.getTime();
  const julOffset = new Date(jul.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" })).getTime() - jul.getTime();
  // Current offset: check if we're in DST
  const nowAmsterdam = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
  const currentOffsetMs = nowAmsterdam.getTime() - now.getTime();
  
  const dayStart = new Date(`${dayStr}T00:00:00Z`);
  dayStart.setTime(dayStart.getTime() - currentOffsetMs);
  
  const dayEnd = new Date(`${dayStr}T23:59:59.999Z`);
  dayEnd.setTime(dayEnd.getTime() - currentOffsetMs);
  
  return [dayStart, dayEnd];
}

const Index = () => {
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("");
  const [dayFilter, setDayFilter] = useState<"all" | "today" | "tomorrow">("all");
  const { data: deals, isLoading } = useActiveDeals(category, city);
  const { data: allDealsForCounts } = useActiveDeals("all", city);

  const filteredDeals = useMemo(() => {
    if (!deals || dayFilter === "all") return deals;
    const offset = dayFilter === "today" ? 0 : 1;
    const [dayStart, dayEnd] = getAmsterdamDayBoundaries(offset as 0 | 1);
    return deals.filter((deal) => {
      const activeFrom = new Date(deal.start_time || deal.created_at);
      const activeUntil = new Date(deal.expiry_time);
      // Overlap check: activeFrom <= dayEnd AND activeUntil >= dayStart
      return activeFrom <= dayEnd && activeUntil >= dayStart;
    });
  }, [deals, dayFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const deal of allDealsForCounts || []) {
      if (deal.category) {
        counts[deal.category] = (counts[deal.category] || 0) + 1;
      }
    }
    return counts;
  }, [allDealsForCounts]);

  return (
    <>
      <section className="bg-primary text-primary-foreground py-8 sm:py-12">
        <div className="container relative text-center space-y-3">
          <img src={lolLogo} alt="Last Ones Left logo" className="absolute left-1/2 -translate-x-[calc(50%+22rem)] sm:-translate-x-[calc(50%+24rem)] top-1/2 -translate-y-1/2 h-20 w-20 sm:h-24 sm:w-24 rounded-full hidden sm:block" />
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Bezoek. Beleef. Bespaar.
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-lg mx-auto">
            Ontdek last-minute deals bij jou in de buurt! Wat ga jij doen vandaag?
          </p>
        </div>
      </section>

      <DealFilters
        category={category}
        city={city}
        dayFilter={dayFilter}
        onCategoryChange={setCategory}
        onCityChange={setCity}
        onDayFilterChange={setDayFilter}
        categoryCounts={categoryCounts}
      />

      <section className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        ) : filteredDeals && filteredDeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">Geen deals gevonden</h2>
            <p className="text-muted-foreground">
              Probeer een andere categorie of stad.
            </p>
          </div>
        )}
      </section>
    </>
  );
};

export default Index;
