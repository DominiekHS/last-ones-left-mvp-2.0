# Persoonlijke meldingen voor consumenten

## Resultaat
Consumenten kiezen verplicht tijdens registratie tussen alle deals, persoonlijke deals of geen meldingsmails. De admin bepaalt welke activiteiten en bedrijven beschikbaar zijn voor persoonlijke voorkeuren. Bestaande consumenten behouden hun huidige meldingsinstelling.

## 1. Voorkeuren en beschikbare keuzes
- Bewaar meldingen aan/uit apart van de voorkeur voor alle of persoonlijke deals.
- Bewaar geselecteerde activiteiten en bedrijven ook wanneer meldingen uitstaan.
- Bestaande accounts krijgen de voorkeur ‘alle deals’, zonder hun huidige aan/uit-instelling te wijzigen.
- Voeg adminbeheer toe voor selecteerbare activiteiten en bedrijven. Dit verandert de bestaande advertentiecategorieën niet.
- Bied geen testbedrijven, verwijderde bedrijven of niet-actieve bedrijven aan.
- Bewaar voorkeuren voor later uitgeschakelde keuzes, maar laat deze niet meetellen zolang ze niet beschikbaar zijn. Bij opnieuw beschikbaar maken worden de bewaarde voorkeuren weer actief.

## 2. Verplichte keuze bij registratie
- Laat nieuwe consumenten bewust kiezen: ‘Alle deals ontvangen’, ‘Alleen deals die bij mij passen’ of ‘Geen meldingsmails ontvangen’; vink niets vooraf aan.
- Toon bij persoonlijke meldingen alfabetische aanvinklijsten van de door de admin beschikbaar gemaakte activiteiten en bedrijven.
- Vereis minimaal één activiteit of één bedrijf bij persoonlijke meldingen.
- Verwerk en controleer voorkeuren bij accountaanmaak, zowel met als zonder e-mailbevestiging. Vertrouw niet op een profielupdate nadat iemand zich heeft geregistreerd maar nog niet is ingelogd.
- Houd e-mailbevestiging en referralverwerking intact.

## 3. Consumentenaccount en bestaande knoppen
- Voeg bij het consumentenaccount een tab ‘Meldingsvoorkeuren’ toe met de aan/uit-schakelaar, alle/persoonlijke keuze en de aanvinklijsten.
- Sta het aanpassen van voorkeuren toe terwijl mails uitstaan; opslaan schakelt mails niet automatisch in.
- Houd de bestaande meldingenknop zichtbaar.
- Laat alle bestaande inschakelknoppen, ook onder voorbeeldadvertenties, de bewaarde voorkeur herstellen.
- Vraag om geldige voorkeuren wanneer persoonlijke meldingen opnieuw worden aangezet zonder beschikbare selectie; schakel niet stilzwijgend over naar alle deals.

## 4. Ontvangers van meldingsmails
- Pas de gedeelde ontvangersselectie aan voor zowel directe als ingeplande publicaties.
- Meldingen uit: geen mail. Alle deals: de huidige selectie blijft gelden. Persoonlijke deals: een overeenkomst met de advertentiecategorie óf het bedrijf is voldoende.
- Verstuur bij een dubbele overeenkomst slechts één mail.
- Behoud alle bestaande uitsluitingen, waaronder dummy-accounts en testadvertenties.
- Gebruik de categorie van de advertentie, niet de algemene categorie van het bedrijf.
- Bewerken en verlengen veroorzaken geen nieuwe mail. Gewijzigde voorkeuren veroorzaken geen verzending voor oude advertenties.
- Haal ontvangers en benodigde selecties volledig in delen op, zonder verlies door de grens van 1.000 resultaten.
- Behoud het verzendlog en voeg geselecteerde ontvangersaantallen toe, verdeeld over alle en persoonlijke deals. Brevo blijft de bron voor daadwerkelijke afleverstatus.

## 5. Technische uitwerking
- Gebruik additive databasewijzigingen voor voorkeuren en adminbeheerde keuzelijsten, met expliciete grants en RLS.
- Consumenten kunnen alleen hun eigen voorkeuren lezen en wijzigen; uitsluitend admins kunnen de beschikbare keuzes beheren.
- Maak voor registratie alleen veilige openbare keuzelijstgegevens beschikbaar; geen interne bedrijfsgegevens.
- Valideer categorieën, selecteerbare bedrijven en de vereiste persoonlijke selectie server-side. Voorkeuren mogen geen invloed hebben op rollen of rechten.
- Breid beide publicatiefuncties uit met advertentiecategorie en bedrijfsidentiteit voor de gedeelde selectie.
- Gebruik dezelfde voorkeurenregels bij registratie, profielwijzigingen en inschakelknoppen om afwijkend gedrag te voorkomen.
- Behoud de huidige Brevo-verbinding, geplande taken en afgeschermde cron-authenticatie.

## 6. Controle en ingebruikname
- Voeg gerichte tests toe voor alle/persoonlijk/uit, activiteitmatch, bedrijfsmatch, dubbele match en geen match.
- Test het bewaren en herstellen van voorkeuren, uitgeschakelde keuzes en behoud van bestaande instellingen.
- Controleer dat een consument geen voorkeuren van anderen of adminselecties kan wijzigen.
- Controleer registratie met en zonder e-mailbevestiging en het teruglezen van opgeslagen voorkeuren.
- Controleer directe en ingeplande publicaties, uitgesloten accounts en selectie boven 1.000 resultaten.
- Doorloop registratie, voorkeuren wijzigen en opnieuw inschakelen met echte testaccounts, op desktop en mobiel.
- Controleer verzending met uitsluitend gecontroleerde testontvangers; stuur geen testmails naar bestaande consumenten.

## Buiten deze versie
Instagram, plaats/afstand, dagoverzichten, automatische uitnodigingen voor bestaande consumenten en nieuwe mails bij bewerken of verlengen.