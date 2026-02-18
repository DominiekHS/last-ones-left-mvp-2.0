import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FlaskConical } from "lucide-react";

export default function TestInfo() {
  return (
    <div className="container py-8 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Terug naar deals
        </Link>
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Testversie</h1>
        </div>
        <p className="text-muted-foreground">
          Welkom bij de testversie van Last Ones Left!
        </p>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        <div className="space-y-1">
          <h2 className="font-display font-semibold text-lg">Wat is dit?</h2>
          <p>
            Last Ones Left is hét online marktplaatsplatform voor last-minute deals voor activiteiten
            bij jou in de buurt. Op dit moment draaien we een testversie om het platform te testen.
            Leuk dat je gebruik wilt maken van Last Ones Left!
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="font-display font-semibold text-lg">Wat kun je verwachten?</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Het aanbod aan deals is beperkt tijdens de testperiode.</li>
            <li>Sommige functies kunnen nog in ontwikkeling zijn.</li>
            <li>Er kunnen kleine fouten of onvolkomenheden voorkomen.</li>
          </ul>
        </div>

        <div className="space-y-1">
          <h2 className="font-display font-semibold text-lg">Feedback?</h2>
          <p>
            Jouw feedback helpt ons om Last Ones Left beter te maken! Heb je suggesties, vragen
            of kom je een probleem tegen? Neem dan gerust{" "}
            <Link to="/contact" className="text-primary font-medium underline underline-offset-2">
              contact
            </Link>{" "}
            met ons op.
          </p>
        </div>
      </div>
    </div>
  );
}
