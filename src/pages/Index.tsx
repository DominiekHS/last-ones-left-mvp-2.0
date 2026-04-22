import { useState, useMemo } from "react";

import lolLogo from "@/assets/lol-logo.png";
import { useActiveDeals } from "@/hooks/useDeals";
import { DealCard } from "@/components/deals/DealCard";
import { DealFilters } from "@/components/deals/DealFilters";
import { ActivityRequestDialog } from "@/components/deals/ActivityRequestDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket } from "lucide-react";

const Index = () => {
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("");
  const { data: deals, isLoading } = useActiveDeals(category, city);
  const { data: allDealsForCounts } = useActiveDeals("all", city);

  const filteredDeals = deals;

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
          <div className="text-center py-16 space-y-4 max-w-md mx-auto">
            <Ticket className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">Geen deals gevonden</h2>
            <p className="text-muted-foreground">
              Probeer een andere categorie of plaats.
            </p>
            <div className="pt-2 space-y-2">
              <p className="text-sm text-muted-foreground">
                Mis je een activiteit? Laat het ons weten — dan proberen we meer deals zoals dit te regelen.
              </p>
              <ActivityRequestDialog
                contextCity={city}
                contextCategory={category}
                contextDayFilter={dayFilter}
              />
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default Index;
