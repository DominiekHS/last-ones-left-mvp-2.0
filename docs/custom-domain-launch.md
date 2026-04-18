# Custom domain pre-launch checklist

Wanneer je het project koppelt aan een eigen domein (bv. `lastonesleft.nl`), moet je een paar plekken handmatig bijwerken zodat auth-flows, e-mails en links naar het juiste domein verwijzen. Lovable regelt het hosting-deel automatisch — de rest staat hier.

> **Wat Lovable automatisch doet** (geen actie nodig):
> - HTTPS forceren + http→https redirect (zowel voor `*.lovable.app` als custom domains)
> - TLS-certificaten aanvragen + auto-renewal (Let's Encrypt)
> - SPA routing voor deep links (geen `_redirects` nodig)

## Stap 1 — Domein koppelen in Lovable

1. **Project Settings → Domains → Connect Domain**
2. Voeg **beide** entries toe:
   - `lastonesleft.nl` (root)
   - `www.lastonesleft.nl`
3. Markeer één als **Primary** (aanrader: `lastonesleft.nl` zonder `www`).
4. Wacht tot status `Active` is. DNS-propagatie kan tot 72 uur duren — meestal binnen een uur klaar.

Volledige instructies: zie de Lovable docs over custom domains.

## Stap 2 — Backend (Lovable Cloud → Auth) bijwerken

Zonder deze stap blijven auth-redirects en e-mailtemplates verwijzen naar de oude `lovable.app`-URL.

Open **Lovable Cloud → Auth → URL Configuration** en pas aan:

| Veld | Nieuwe waarde |
|---|---|
| **Site URL** | `https://lastonesleft.nl` |
| **Redirect URLs** | Voeg toe: `https://lastonesleft.nl/**` en `https://www.lastonesleft.nl/**`. **Behoud** de `https://*.lovableproject.com/**` entry zolang je de preview-omgeving nog gebruikt. |

> ⚠️ De Site URL bepaalt waar **alle** auth-redirects naartoe gaan (na e-mail verificatie, na password reset, na OAuth-callback). Niet aanpassen = gebruikers landen na klikken op de e-mail-link op het oude domein.

## Stap 3 — Frontend code: niets te doen

Onze code gebruikt nergens hardcoded `lastonesleft.nl` of preview-URLs. Auth-redirects zijn relatief:

| Plek in code | Wat het gebruikt |
|---|---|
| `src/pages/auth/Register.tsx` | `window.location.origin` → klopt automatisch |
| `src/pages/auth/ForgotPassword.tsx` | `${window.location.origin}/reset-password` → klopt automatisch |
| `src/pages/Contact.tsx` (e-mail link) | `mailto:` → geen domein-issue |

✅ Geen wijzigingen in de code nodig.

## Stap 4 — E-mailtemplates checken

Als je later **custom auth-e-mailtemplates** scaffold (Lovable → Cloud → Emails), worden links daarin door Lovable automatisch op basis van Site URL gerenderd. Mits stap 2 correct is gedaan → niets meer te doen.

Tot die tijd worden de **default Lovable auth-e-mails** gebruikt — die respecteren ook de Site URL.

## Stap 5 — Post-launch verificatie (5 min)

Loop deze lijst af **nadat** het custom domain `Active` is:

- [ ] Open `http://lastonesleft.nl` → wordt geredirect naar `https://lastonesleft.nl` (301)
- [ ] Open `http://www.lastonesleft.nl` → idem
- [ ] Browser-tab toont 🔒 (geldig certificaat, geen waarschuwingen)
- [ ] Browser console open: navigeer door homepage / deal-detail / login → **geen mixed content warnings**
- [ ] Registreer een testaccount → verificatie-e-mail bevat link naar `https://lastonesleft.nl/...` (niet `lovable.app`)
- [ ] Klik de verificatie-link → landt op het custom domain en account is geactiveerd
- [ ] "Wachtwoord vergeten" → reset-e-mail bevat link naar `https://lastonesleft.nl/reset-password?...`
- [ ] Login werkt op zowel `lastonesleft.nl` als `www.lastonesleft.nl` (beide krijgen sessie)
- [ ] Mobile data getest (4G/5G) — niet alleen wifi

Vindt iets fout? → meestal stap 2 (Site URL) niet of verkeerd ingesteld.

## Wat we **niet** doen op MVP

- ❌ **HSTS-header (`Strict-Transport-Security`)** — Lovable hosting beheert response headers; we kunnen die niet via repo-config zetten. De combinatie van automatische http→https redirect + geldig TLS-cert dekt het gros van de bedreigingen. HSTS preload-list is een eenmalige actie die we later overwegen als we langere tijd stabiel op één domein draaien.
- ❌ **Aparte staging/preview-allowlist verwijderen** — handig om te behouden zodat preview-builds blijven werken voor testen.
- ❌ **CORS-allowlist hardenen** — bewust overgeslagen (zie security hardening #14): we draaien zonder cookies, auth gaat via `Authorization: Bearer`-header, en CORS biedt in onze setup weinig extra bescherming.

## Domein wijzigen of weghalen

Loop dezelfde stappen in omgekeerde volgorde:
1. **Eerst** Site URL in Lovable Cloud → Auth terugzetten naar het nieuwe / oude domein.
2. **Daarna** pas het domein loskoppelen in Project Settings → Domains.

Andersom (eerst domein loskoppelen) → bestaande sessies + verzonden e-mails wijzen naar een dood adres.
