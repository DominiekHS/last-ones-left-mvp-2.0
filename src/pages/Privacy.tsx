import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const LAST_UPDATED = "7 februari 2026";

const sections = [
  { id: "inleiding", title: "Inleiding" },
  { id: "gegevens", title: "Welke gegevens verzamelen wij?" },
  { id: "doel", title: "Waarvoor gebruiken wij je gegevens?" },
  { id: "delen", title: "Delen met derden" },
  { id: "beveiliging", title: "Beveiliging" },
  { id: "bewaartermijn", title: "Bewaartermijn" },
  { id: "rechten", title: "Jouw rechten" },
  { id: "cookies", title: "Cookies" },
  { id: "wijzigingen", title: "Wijzigingen in dit beleid" },
  { id: "contact", title: "Contact" },
];

export default function Privacy() {
  return (
    <div className="container py-6 max-w-2xl space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Terug naar deals</Link>
      </Button>

      <div>
        <h1 className="font-display text-3xl font-bold">Privacybeleid</h1>
        <p className="text-sm text-muted-foreground mt-1">Laatste update: {LAST_UPDATED}</p>
      </div>

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

      <div className="space-y-8 text-sm leading-relaxed text-foreground">
        <section id="inleiding">
          <h2 className="font-display text-xl font-bold mb-2">1. Inleiding</h2>
          <p>
            Last Ones Left hecht veel waarde aan de bescherming van jouw persoonsgegevens. In dit
            privacybeleid leggen wij uit welke gegevens wij verzamelen, waarom wij dat doen en
            hoe wij daarmee omgaan. Dit beleid is van toepassing op alle gebruikers van het
            Last Ones Left platform.
          </p>
        </section>

        <section id="gegevens">
          <h2 className="font-display text-xl font-bold mb-2">2. Welke gegevens verzamelen wij?</h2>
          <p>Bij het gebruik van Last Ones Left kunnen wij de volgende gegevens verzamelen:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Accountgegevens:</strong> e-mailadres, naam en geboortedatum (optioneel).</li>
            <li><strong>Gebruiksgegevens:</strong> welke deals je bekijkt en claimt, en wanneer.</li>
            <li><strong>Technische gegevens:</strong> IP-adres, browsertype en apparaatinformatie.</li>
            <li><strong>Merchant-gegevens:</strong> bedrijfsnaam, adres en omschrijving (voor aanbieders).</li>
          </ul>
        </section>

        <section id="doel">
          <h2 className="font-display text-xl font-bold mb-2">3. Waarvoor gebruiken wij je gegevens?</h2>
          <p>Wij gebruiken je gegevens voor de volgende doeleinden:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Het aanmaken en beheren van je account.</li>
            <li>Het aanbieden en personaliseren van deals.</li>
            <li>Het verwerken van geclaimde kortingscodes.</li>
            <li>Het verbeteren van ons platform en de gebruikerservaring.</li>
            <li>Het voorkomen van misbruik en fraude.</li>
            <li>Het voldoen aan wettelijke verplichtingen.</li>
          </ul>
        </section>

        <section id="delen">
          <h2 className="font-display text-xl font-bold mb-2">4. Delen met derden</h2>
          <p>
            Wij delen je persoonlijke gegevens niet met derden, behalve wanneer dit noodzakelijk is
            voor het functioneren van het platform (bijvoorbeeld het tonen van je geclaimde deals aan
            de aanbieder) of wanneer wij hiertoe wettelijk verplicht zijn. Wij verkopen je gegevens
            nooit aan derden.
          </p>
        </section>

        <section id="beveiliging">
          <h2 className="font-display text-xl font-bold mb-2">5. Beveiliging</h2>
          <p>
            Wij nemen passende technische en organisatorische maatregelen om je gegevens te beschermen
            tegen ongeautoriseerde toegang, verlies of misbruik. Alle verbindingen met ons platform
            zijn versleuteld en wij bewaren gegevens op beveiligde servers.
          </p>
        </section>

        <section id="bewaartermijn">
          <h2 className="font-display text-xl font-bold mb-2">6. Bewaartermijn</h2>
          <p>
            Wij bewaren je gegevens niet langer dan noodzakelijk voor de doeleinden waarvoor ze zijn
            verzameld. Accountgegevens worden bewaard zolang je account actief is. Na het verwijderen
            van je account worden je gegevens binnen een redelijke termijn verwijderd.
          </p>
        </section>

        <section id="rechten">
          <h2 className="font-display text-xl font-bold mb-2">7. Jouw rechten</h2>
          <p>Je hebt de volgende rechten met betrekking tot je persoonsgegevens:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Inzage:</strong> je mag opvragen welke gegevens wij van je hebben.</li>
            <li><strong>Correctie:</strong> je kunt onjuiste gegevens laten aanpassen.</li>
            <li><strong>Verwijdering:</strong> je kunt verzoeken om je gegevens te verwijderen.</li>
            <li><strong>Bezwaar:</strong> je kunt bezwaar maken tegen de verwerking van je gegevens.</li>
            <li><strong>Overdraagbaarheid:</strong> je kunt vragen om je gegevens over te dragen.</li>
          </ul>
          <p className="mt-2">
            Neem contact met ons op via de{" "}
            <Link to="/contact" className="text-primary hover:underline font-medium">contactpagina</Link>
            {" "}om gebruik te maken van je rechten.
          </p>
        </section>

        <section id="cookies">
          <h2 className="font-display text-xl font-bold mb-2">8. Cookies</h2>
          <p>
            Last Ones Left maakt gebruik van functionele cookies die noodzakelijk zijn voor het
            functioneren van het platform, zoals het onthouden van je inlogsessie. Wij maken geen
            gebruik van tracking cookies of cookies van derden voor advertentiedoeleinden.
          </p>
        </section>

        <section id="wijzigingen">
          <h2 className="font-display text-xl font-bold mb-2">9. Wijzigingen in dit beleid</h2>
          <p>
            Wij kunnen dit privacybeleid van tijd tot tijd aanpassen. Wijzigingen worden op deze
            pagina gepubliceerd met een bijgewerkte datum. Bij significante wijzigingen informeren
            wij je per e-mail.
          </p>
        </section>

        <section id="contact">
          <h2 className="font-display text-xl font-bold mb-2">10. Contact</h2>
          <p>
            Heb je vragen over dit privacybeleid of over hoe wij met je gegevens omgaan? Neem dan
            contact met ons op via de{" "}
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
