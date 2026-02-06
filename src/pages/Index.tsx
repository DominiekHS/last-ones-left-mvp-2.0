import { useState } from "react";
import { useActiveDeals } from "@/hooks/useDeals";
import { DealCard } from "@/components/deals/DealCard";
import { DealFilters } from "@/components/deals/DealFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Ticket } from "lucide-react";

const Index = () => {
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("");
  const { data: deals, isLoading } = useActiveDeals(category, city);

  return (
    <>
      <section className="bg-foreground text-background py-8 sm:py-12">
        <div className="container text-center space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Bezoek. Beleef. Bespaar.
          </h1>
          <p className="text-background/70 text-lg max-w-lg mx-auto">
            Ontdek last-minute deals bij jou in de buurt — vandaag nog!
          </p>
        </div>
      </section>

      <DealFilters
        category={category}
        city={city}
        onCategoryChange={setCategory}
        onCityChange={setCity}
      />

      <section className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        ) : deals && deals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {deals.map((deal) => (
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
