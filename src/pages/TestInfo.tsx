import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const STEPS = [
  {
    title: "Ontdek activiteiten",
    description: "Bekijk de beschikbare deals van bedrijven in Groningen.",
  },
  {
    title: "Vind jouw deal",
    description: "Filter op locatie en activiteit en kies wat bij je past.",
  },
  {
    title: "Profiteer van korting",
    description: "Bekijk de aanbieding en volg de stappen om de deal te gebruiken.",
  },
];

export default function TestInfo() {
  return (
    <div className="container py-8 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="-ml-3 px-3 text-muted-foreground">
        <Link to="/">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Terug naar deals
        </Link>
      </Button>

      <div className="mt-3 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Over Last Ones Left</h1>
          <Badge className="bg-primary text-primary-foreground font-bold text-[10px] uppercase">
            Groningen
          </Badge>
        </div>
        <p className="text-muted-foreground">Bezoek. Beleef. Bespaar.</p>
      </div>

      <div className="mt-6 space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-display font-semibold text-base">
            Spontaan iets leuks doen, maar dan met korting.
          </h2>
          <p>
            Last Ones Left is hét platform voor last-minute aanbiedingen van activiteiten bij jou in
            de buurt. Ontdek wat er te doen is, profiteer van korting en beleef meer voor minder.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display font-semibold text-base">Hoe werkt Last Ones Left?</h2>
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-2">
                <span className="font-semibold tabular-nums">{index + 1}.</span>
                <div className="space-y-1">
                  <p className="font-semibold">{step.title}</p>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-semibold text-base">Last Ones Left in Groningen</h2>
          <p>
            Inmiddels hebben bijna 1.000 consumenten een account aangemaakt en plaatsen de eerste
            aangesloten bedrijven in Groningen hun aanbiedingen op het platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display font-semibold text-base">Blijf op de hoogte</h2>
          <p>
            Nieuwe deals niet missen? Maak een gratis account aan en kies welke aanbiedingen je per
            e-mail wilt ontvangen.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Bekijk de deals</Link>
          </Button>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-semibold text-base">Vragen of suggesties?</h2>
          <p>
            Heb je een vraag, een idee of werkt er iets niet zoals verwacht? Neem gerust{" "}
            <Link
              to="/contact"
              className="font-medium underline underline-offset-2 hover:text-primary"
            >
              contact
            </Link>{" "}
            met ons op. Jouw feedback helpt Last Ones Left verder te verbeteren.
          </p>
        </section>
      </div>
    </div>
  );
}
