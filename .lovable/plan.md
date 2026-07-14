# Plan: Proefadvertenties (teasers) door admin

Doel: als admin kunnen we "proefadvertenties" plaatsen die er visueel uitzien als een deal, maar geen prijs/korting/claim hebben. Ze vullen lege categorieën en verdwijnen zodra een bedrijf in dezelfde categorie + plaats een echte deal plaatst.

---

## 1. Database — wijzigingen op `deals`

Eén migratie, alles op de bestaande `deals`-tabel (Optie A).

**Nieuwe kolommen**
- `is_teaser boolean not null default false` — markeert de rij als proefadvertentie
- `teaser_cta_label text` — optionele knoptekst (bv. "Meldingen aan", "Deel met vrienden")
- `teaser_cta_url text` — optionele link/actie voor die knop
- `teaser_body text` — vrije uitlegtekst op detailpagina ("Dit is een voorproefje…")
- `always_show boolean not null default false` — als true blijft de teaser óók zichtbaar als er echte deals in dezelfde categorie+plaats zijn

**Nullable maken voor teasers**
- `original_price`, `discount_percentage`, `expiry_time`, `start_time` → nullable maken. Er komt een `CHECK`-trigger die afdwingt: **óf** `is_teaser = true`, **óf** al deze velden verplicht (huidige regels blijven voor echte deals).
- `merchant_id` blijft NOT NULL. We maken één system-merchant "Last Ones Left" (interne admin) waar teasers aan hangen. Dit voorkomt joins/RLS-uitzonderingen.

**Indexen**
- `create index deals_teaser_lookup on deals(is_teaser, category, lower(city)) where deleted_at is null;`

**Publieke view `deals_public`**
- `is_teaser`, `teaser_cta_label`, `teaser_cta_url`, `teaser_body`, `always_show` toevoegen.
- View blijft `expiry_time > now()` filteren; voor teasers wordt `expiry_time` gezet op `now() + interval '100 years'` zodat ze niet verlopen. (Simpeler dan de view-definitie aanpassen.)

**RLS-updates op `deals`**
- INSERT/UPDATE waarbij `is_teaser = true`: alleen als `has_role(auth.uid(),'admin')`.
- Merchant-policies blijven ongewijzigd (kunnen geen teasers maken, want ze zijn niet admin).
- Bestaande SELECT-policies blijven werken; teasers zijn "eigendom" van de system-merchant.

**`claim_deal` RPC**
- Vroege check: `if v_deal.is_teaser then raise exception 'Cannot claim teaser';`

---

## 2. Auto-verbergen: query-time filter (categorie + plaats)

Aanpassing in `useActiveDeals` (`src/hooks/useDeals.ts`):

1. Haal alle actieve deals op zoals nu (via `deals_public`), inclusief `is_teaser` en `always_show`.
2. Bepaal per (category, lower(city))-combinatie of er ≥1 **echte** deal is (`is_teaser = false`).
3. Filter teasers eruit als die combinatie een echte deal bevat, tenzij `always_show = true`.

Volgorde in output: echte deals eerst (op `start_time`), teasers erachter.

Voor de category-counts op de homepage (`allDealsForCounts`) tellen teasers niet mee — telling gaat alleen over echte deals, zodat het aantal in de filterchips overeenkomt met wat consumenten claimen kunnen.

---

## 3. UI

### DealCard (teaser-variant)
Zelfde layout, subtiele visuele verschillen:
- Kaart-overlay: lichte grijs/tint (`bg-muted/40` overlay of `opacity-95`)
- Kortingsbadge: `?%` in plaats van `-30%`, badge-kleur `secondary` i.p.v. primary
- Categoriebadge onveranderd
- Rechter-boven extra badge: **"Proefadvertentie"** (kleine outline-badge)
- Prijsblok toont `€ ?` (doorgestreepte prijs weglaten) met kleine tekst *"Nog geen prijs bekend"*
- Titel, plaats, tijden onveranderd — als teaser geen tijd heeft, tonen we alleen "Binnenkort"

### Detailpagina (`DealDetail`)
Als `deal.is_teaser === true`:
- Bovenaan een strip: **"Dit is een voorproefje — nog geen actieve deal. Bedrijven kunnen deze plek binnenkort claimen."**
- Prijsblok verborgen; in plaats daarvan `teaser_body` (rich text alinea).
- Geen claim-knop, geen kortingscode-blok, geen betaalstappen, geen annuleringsvoorwaarden.
- CTA-knop: `teaser_cta_label` → `teaser_cta_url` (target=_blank als externe URL, anders in-app route). Fallback: "Meldingen aan" die naar profiel-instellingen linkt.
- Merchant-blok (Last Ones Left system-merchant) wordt vervangen door tekst *"Geplaatst door Last Ones Left"* — geen link naar merchantprofiel.
- `<meta name="robots" content="noindex,nofollow">` via react-helmet-async voor deze route wanneer teaser.

### Admin-portal
Nieuwe tab of knop op AdminDashboard: **"Proefadvertentie maken"** → nieuw scherm `src/pages/admin/AdminTeaserForm.tsx`.

Velden:
- Titel *
- Categorie * (bestaande enum)
- Plaats * + postcode (optioneel)
- Adres (optioneel)
- Afbeelding * (upload naar `deal-images` bucket, zelfde flow als AdForm)
- Uitleg / teaser_body * (textarea, 20–500 tekens)
- CTA-label (optioneel, default "Meldingen aan")
- CTA-URL (optioneel; leeg = in-app default)
- `always_show` (checkbox, default uit) met uitleg-tooltip

Geen prijs, korting, start-/expiry-tijd, kortingscode, unique codes, redemption method, betaalstappen.

Overzicht: bestaande admin deals-lijst krijgt filter-chip "Type: alle / echt / proef". Teasers tonen "Proef"-badge.

---

## 4. Analytics-scheiding

- `deal_events` blijft ongewijzigd; view/click op teasers wordt gewoon geregistreerd.
- Merchant-analytics (`useDealEvents`, `deal_sales_daily`) zien teasers niet, want ze horen bij de system-merchant. Merchants blijven schone cijfers houden.
- Admin-overzicht krijgt een extra kaart "Teaser-performance" (views + clicks per teaser) op AdminDashboard. Klein, later uit te breiden — buiten scope van deze eerste bouwslag als je wil, maar de data is er al.

---

## 5. Implementatiestappen (volgorde)

1. **Migratie** — kolommen toevoegen op `deals`, view uitbreiden, indexen, RLS-policy voor admin-teasers, system-merchant "Last Ones Left" seeden, `claim_deal` bijwerken, CHECK-trigger voor teaser-vs-echt.
2. **Types regeneratie** — automatisch door Lovable na migratie.
3. **Hook update** — `useActiveDeals` filtert teasers weg als echte deal in categorie+plaats bestaat (tenzij `always_show`). Category-counts negeren teasers.
4. **DealCard** — teaser-variant met grijzige tint, `?%`-badge, "Proefadvertentie"-badge, prijs vervangen door "€ ?".
5. **DealDetail** — teaser-modus met strip, `teaser_body`, CTA-knop, geen claim, noindex meta.
6. **Admin-form** — `AdminTeaserForm.tsx` + route (`/admin/proefadvertentie/nieuw` en `/admin/proefadvertentie/:id`), knop op AdminDashboard.
7. **Admin-lijst** — filter-chip "Type" in bestaande admin-deals-overzicht, "Proef"-badge in rij.
8. **Smoke-tests**:
   - Teaser maken → verschijnt op home in lege categorie.
   - Echte deal aanmaken in dezelfde categorie + plaats → teaser verdwijnt.
   - `always_show` aan → teaser blijft.
   - Consumer probeert teaser te claimen via directe URL → RPC weigert.
   - Category-count klopt (teasers tellen niet mee).

---

## Technische samenvatting (voor development)

| Wijziging | Bestand / object |
|---|---|
| Schema | migratie: kolommen, view, RLS, trigger, seed system-merchant |
| RPC | `claim_deal` — reject when `is_teaser` |
| Hook | `src/hooks/useDeals.ts` — teaser-filter + count-filter |
| Card | `src/components/deals/DealCard.tsx` — teaser-branch |
| Detail | `src/pages/DealDetail.tsx` — teaser-branch + noindex |
| Admin form | `src/pages/admin/AdminTeaserForm.tsx` (nieuw) |
| Admin list | `src/pages/admin/AdminDashboard.tsx` — type-filter + badge + "Nieuwe proef"-knop |
| Router | `src/App.tsx` — 2 admin-routes toevoegen |

Zeg **ja** als ik dit mag bouwen, of geef aan wat je nog wilt aanpassen.
