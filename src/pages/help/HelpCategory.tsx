import { useParams, Link } from "react-router-dom";
import { useHelpCategory, useHelpArticles } from "@/hooks/useHelp";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, HelpCircle, MessageCircle } from "lucide-react";

export default function HelpCategory() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { data: category, isLoading: catLoading } = useHelpCategory(categorySlug);
  const { data: articles, isLoading: articlesLoading } = useHelpArticles(category?.id);

  if (catLoading) {
    return (
      <div className="container py-6 max-w-2xl space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container py-16 text-center space-y-3">
        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">Categorie niet gevonden</h2>
        <p className="text-muted-foreground">Deze helpcategorie bestaat niet.</p>
        <Button variant="link" asChild>
          <Link to="/help">Terug naar Helpcenter</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-4 max-w-2xl space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/help" className="hover:text-foreground">Helpcenter</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{category.title}</span>
      </nav>

      <Button variant="ghost" size="sm" asChild>
        <Link to="/help"><ArrowLeft className="mr-1 h-4 w-4" />Terug</Link>
      </Button>

      {/* Header */}
      <div className="space-y-1">
        <div className="text-3xl">{category.icon}</div>
        <h1 className="font-display text-2xl font-bold">{category.title}</h1>
        <p className="text-muted-foreground text-sm">{category.description}</p>
      </div>

      {/* FAQ Accordion */}
      {articlesLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : articles && articles.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-2">
          {articles.map((article) => (
            <AccordionItem key={article.id} value={article.id} className="border rounded-lg px-4">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                {article.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {article.answer}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-8 space-y-2">
          <p className="text-muted-foreground text-sm">Binnenkort beschikbaar.</p>
          <Button variant="link" asChild>
            <Link to="/contact">Neem contact op</Link>
          </Button>
        </div>
      )}

      {/* Contact CTA */}
      <Card className="border-primary/20">
        <CardContent className="p-4 text-center space-y-2">
          <MessageCircle className="h-6 w-6 mx-auto text-primary" />
          <p className="text-sm font-semibold">Nog steeds hulp nodig?</p>
          <Button size="sm" asChild>
            <Link to="/contact">Contact opnemen</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
