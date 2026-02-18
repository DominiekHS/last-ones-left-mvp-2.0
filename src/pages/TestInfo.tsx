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
            bij jou in de buurt. Filter op locatie en activiteit, bekijk advertenties en ga met korting
            wat leuks doen! Op dit moment is deze testversie live om feedback te verzamelen. Leuk dat
            je gebruik wilt maken van Last Ones Left!
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="font-display font-semibold text-lg">Wat kun je verwachten?</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Bedrijven bieden activiteiten aan om vandaag en morgen te doen</li>
            <li>Jouw spontaniteit wordt beloond met korting</li>
            <li>Er wordt hard gewerkt om dit platform constant te verbeteren, help je mee?</li>
          </ul>
        </div>

        <div className="space-y-1">
          <h2 className="font-display font-semibold text-lg">Meehelpen door feedback te delen?</h2>
          <p>
            Ja graag! Jouw feedback helpt ons om Last Ones Left beter te maken! Heb je suggesties, vragen
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
