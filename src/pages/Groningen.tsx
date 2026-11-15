import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Flag, Footprints, GlassWater, Goal, CircleDot, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACTIVITIES = [
  {
    name: "Cocktailwalk in Groningen",
    icon: GlassWater,
    description: "Combineer een wandeling door Groningen met cocktails. Een cocktailwalk is een ontspannen manier om samen op pad te gaan en onderweg iets te drinken. Bekijk bij de aanbieding welke route, locaties en drankjes inbegrepen zijn.",
  },
  {
    name: "Pitch & putt in Groningen",
    icon: Flag,
    description: "Pitch & putt draait om korte golfholes: sla de bal richting de green en probeer hem met zo weinig mogelijk slagen in de hole te krijgen. Een activiteit voor een uitje met vrienden, familie of collega's, waarbij precisie belangrijker is dan afstand.",
  },
  {
    name: "Minigolf in Groningen",
    icon: CircleDot,
    description: "Bij minigolf speel je de bal langs hindernissen naar de hole. Daag elkaar uit, houd de score bij en ontdek wie de baan met de minste slagen afrondt. Een speelse keuze voor een gezamenlijk uitje.",
  },
  {
    name: "Voetgolf in Groningen",
    icon: Goal,
    description: "Voetgolf combineert voetbal met golf. Je speelt met je voeten een voetbal richting een grote hole en probeert de ronde met zo weinig mogelijk schoten af te maken. Leuk om samen buiten actief te zijn en elkaar uit te dagen.",
  },
  {
    name: "Bowlen in Groningen",
    icon: Footprints,
    description: "Samen een baan op, de kegels omgooien en kijken wie de meeste strikes maakt: bowlen is een gezellige activiteit met vrienden, familie of collega's. Last Ones Left breidt het aanbod in Groningen binnenkort uit met bowlingdeals.",
  },
  {
    name: "Karten in Groningen",
    icon: Gauge,
    description: "Tijdens het karten draait het om bochten, controle en rondetijden. Daag je gezelschap uit op de baan en ontdek wie de snelste ronde rijdt. Last Ones Left breidt het aanbod in Groningen binnenkort uit met kartdeals.",
  },
];

export default function Groningen() {
  return (
    <div className="bg-card text-card-foreground">
      <div className="container max-w-4xl py-8 sm:py-12">
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-5 text-muted-foreground">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" />Terug naar deals</Link>
        </Button>
        <header className="max-w-2xl space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">Last Ones Left in Groningen</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Activiteiten met korting in Groningen</h1>
          <p className="text-base leading-relaxed">
            Spontaan iets leuks doen in Groningen? Ontdek cocktailwalks, pitch &amp; putt, minigolf en voetgolf,
            en binnenkort ook bowlen en karten. Last Ones Left is begonnen in Groningen en brengt
            last-minute aanbiedingen van lokale bedrijven samen.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Het aanbod kan iedere dag veranderen. De bedrijven bepalen welke activiteiten beschikbaar
            zijn, op welke momenten en met welke korting. Alle actuele deals vind je op de homepage,
            waar je kunt filteren op plaats en activiteit.
          </p>
        </header>

        <div className="mt-10 grid gap-x-10 sm:grid-cols-2">
          {ACTIVITIES.map(({ name, icon: Icon, description }) => (
            <section key={name} className="border-t border-border py-6">
              <Icon className="mb-3 h-6 w-6 text-foreground" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">{name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 border-t border-border pt-8">
          <h2 className="font-display text-xl font-semibold">Ontdek wat er nu te doen is</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Zin gekregen om eropuit te gaan? Bekijk het actuele aanbod op de homepage en filter op
            Groningen en je favoriete activiteit. De prijs, beschikbaarheid en voorwaarden staan bij iedere deal.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Bekijk de deals<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </section>
      </div>
    </div>
  );
}