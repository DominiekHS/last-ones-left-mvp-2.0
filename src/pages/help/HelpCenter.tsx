import { Link } from "react-router-dom";
import { useHelpCategories } from "@/hooks/useHelp";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCircle, MessageCircle } from "lucide-react";

export default function HelpCenter() {
  const { data: categories, isLoading } = useHelpCategories();

  return (
    <div className="container py-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <HelpCircle className="h-10 w-10 mx-auto text-primary" />
        <h1 className="font-display text-3xl font-bold">Helpcenter</h1>
        <p className="text-muted-foreground">Vind snel antwoord op je vragen.</p>
      </div>

      {/* Category cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/help/${cat.slug}`} className="block group">
              <Card className="h-full hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20">
                <CardContent className="p-4 space-y-2">
                  <div className="text-2xl">{cat.icon}</div>
                  <h2 className="font-display font-semibold text-sm group-hover:text-primary transition-colors">
                    {cat.title}
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Het helpcenter wordt binnenkort aangevuld.</p>
        </div>
      )}

      {/* Contact section */}
      <Card className="border-primary/20">
        <CardContent className="p-6 text-center space-y-3">
          <MessageCircle className="h-8 w-8 mx-auto text-primary" />
          <h2 className="font-display font-semibold text-lg">Staat je vraag er niet bij?</h2>
          <p className="text-sm text-muted-foreground">
            Neem contact met ons op en we helpen je zo snel mogelijk.
          </p>
          <Button asChild>
            <Link to="/contact">Contact opnemen</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
