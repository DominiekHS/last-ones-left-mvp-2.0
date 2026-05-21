import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "7 februari 2026";

const sections = [
  { id: "over", title: "Over Last Ones Left" },
  { id: "gebruik", title: "Gebruik van het platform" },
  { id: "aanbieders", title: "De rol van aanbieders (merchants)" },
  { id: "deals", title: "Deals, beschikbaarheid en last-minute karakter" },
  { id: "kortingscodes", title: "Kortingscodes en inwisselen" },
  { id: "betalingen", title: "Betalingen en externe checkout" },
  { id: "annuleren", title: "Annuleren, wijzigen en restitutie" },
  { id: "aansprakelijkheid", title: "Aansprakelijkheid" },
  { id: "privacy", title: "Privacy en gegevens" },
  { id: "contact", title: "Contact" },
];

export default function Terms() {
  return (
    <div className="container py-6 max-w-2xl space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Terug naar deals</Link>
      </Button>

      <div>
        <h1 className="font-display text-3xl font-bold">Algemene voorwaarden</h1>
        <p className="text-sm text-muted-foreground mt-1">Laatste update: {LAST_UPDATED}</p>
      </div>

      {/* Inhoudsopgave */}
      <nav className="bg-muted/50 rounded-lg p-4 space-y-1">
        <p className="font-semibold text-sm mb-2">Inhoudsopgave</p>
        <ol className="list-decimal list-inside space-y-1">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-sm text-primary hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Secties */}
      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <section id="over">
          <h2 className="font-display text-xl font-bold mb-2">1. Over Last Ones Left</h2>
          <p>
            Last Ones Left is een last-minute marketplace die consumenten in contact brengt met lokale aanbieders
            die resterende plekken aanbieden voor activiteiten zoals bioscopen, theaters, sportevenementen, musea
            en meer. Wij faciliteren de verbinding tussen aanbieders en consumenten, maar zijn zelf geen partij
            bij de uiteindelijke transactie.
          </p>
        </section>

        <section id="gebruik">
          <h2 className="font-display text-xl font-bold mb-2">2. Gebruik van het platform</h2>
          <p>
            Door gebruik te maken van Last Ones Left ga je akkoord met deze algemene voorwaarden. Het platform
            is beschikbaar voor iedereen die zich registreert met een geldig e-mailadres. Misbruik van het
            platform, waaronder het aanmaken van valse accounts of het claimen van deals zonder de intentie
            deze te gebruiken, kan leiden tot uitsluiting.
          </p>
        </section>

        <section id="aanbieders">
          <h2 className="font-display text-xl font-bold mb-2">3. De rol van aanbieders (merchants)</h2>
          <p>
            Aanbieders zijn zelfstandige ondernemers die hun eigen deals plaatsen op Last Ones Left. Zij zijn
            verantwoordelijk voor de juistheid van de aangeboden informatie, prijzen, kortingscodes en
            beschikbaarheid. Last Ones Left controleert de inhoud van deals, maar kan niet garanderen dat
            alle informatie altijd correct en actueel is.
          </p>
        </section>

        <section id="deals">
          <h2 className="font-display text-xl font-bold mb-2">4. Deals, beschikbaarheid en last-minute karakter</h2>
          <p>
            Alle deals op Last Ones Left hebben een last-minute karakter. Dit betekent dat activiteiten
            binnen 48 uur starten en de beschikbaarheid beperkt is. Deals kunnen op elk moment uitverkocht
            raken of door de aanbieder worden ingetrokken. Last Ones Left kan niet garanderen dat een deal
            beschikbaar blijft tot het moment van claimen.
          </p>
        </section>

        <section id="kortingscodes">
          <h2 className="font-display text-xl font-bold mb-2">5. Kortingscodes en inwisselen</h2>
          <p>
            Bij het claimen van een deal ontvang je een kortingscode. Deze code kun je gebruiken op de
            betaalpagina van de aanbieder (bij online deals) of tonen aan de kassa (bij kassa-deals).
            Kortingscodes zijn persoonlijk en niet overdraagbaar, tenzij anders aangegeven. De aanbieder
            is verantwoordelijk voor het correct verwerken van de kortingscode.
          </p>
        </section>

        <section id="betalingen">
          <h2 className="font-display text-xl font-bold mb-2">6. Betalingen en externe checkout</h2>
          <p>
            Last Ones Left verwerkt geen betalingen. Alle transacties verlopen rechtstreeks tussen de
            consument en de aanbieder, via de checkout van de aanbieder. Last Ones Left is niet
            verantwoordelijk voor betalingsproblemen, fouten in prijzen, of geschillen over transacties.
          </p>
        </section>

        <section id="annuleren">
          <h2 className="font-display text-xl font-bold mb-2">7. Annuleren, wijzigen en restitutie</h2>
          <p>
            Annuleringen en wijzigingen van geclaimde deals lopen via de aanbieder. Gezien het last-minute
            karakter van de deals kunnen er beperkingen gelden voor annulering en restitutie. Raadpleeg
            de voorwaarden van de aanbieder of neem rechtstreeks contact op met de aanbieder voor vragen
            over annulering.
          </p>
        </section>

        <section id="aansprakelijkheid">
          <h2 className="font-display text-xl font-bold mb-2">8. Aansprakelijkheid</h2>
          <p>
            Last Ones Left fungeert als tussenpersoon en is niet aansprakelijk voor de kwaliteit,
            beschikbaarheid of uitvoering van de aangeboden activiteiten. Eventuele klachten over een
            activiteit dienen rechtstreeks bij de aanbieder te worden ingediend. Last Ones Left is niet
            aansprakelijk voor directe of indirecte schade voortvloeiend uit het gebruik van het platform.
          </p>
        </section>

        <section id="privacy">
          <h2 className="font-display text-xl font-bold mb-2">9. Privacy en gegevens</h2>
          <p>
            Wij gaan zorgvuldig om met je persoonlijke gegevens. Bij registratie vragen we alleen de
            noodzakelijke gegevens (e-mailadres, naam). Je gegevens worden niet gedeeld met derden,
            behalve waar nodig voor het functioneren van het platform (bijv. het tonen van je geclaimde
            deals). Voor meer informatie kun je contact met ons opnemen.
          </p>
        </section>

        <section id="contact">
          <h2 className="font-display text-xl font-bold mb-2">10. Contact</h2>
          <p>
            Heb je vragen over deze voorwaarden of over Last Ones Left? Neem dan contact met ons op via
            de{" "}
            <Link to="/contact" className="text-primary hover:underline font-medium">
              contactpagina
            </Link>
            .
          </p>
        </section>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" asChild>
          <Link to="/">Terug naar deals</Link>
        </Button>
      </div>
    </div>
  );
}
