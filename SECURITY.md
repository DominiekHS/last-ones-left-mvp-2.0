# Security policy

> Dit project draait op **Lovable Cloud** (Supabase under the hood). Secrets staan in **edge function secrets**, niet in een `.env` in de repo. Toch hieronder de regels — voor het geval iemand de code lokaal cloont of zelf gaat hosten.

## Gouden regel

**Commit nooit een `.env` bestand of losse secret naar git.**

Lovable beheert `.env` automatisch in de preview-omgeving. Dat bestand staat **niet** in de repo (en hoort er ook niet in).

## Welke keys mogen waar staan?

| Key                              | Mag in client (`VITE_*`) | Mag server-side | Bron |
|----------------------------------|--------------------------|-----------------|------|
| `VITE_SUPABASE_URL`              | ✅                       | ✅              | publiek |
| `VITE_SUPABASE_PUBLISHABLE_KEY`  | ✅ (anon JWT, RLS-beschermd) | ✅          | publiek |
| `SUPABASE_SERVICE_ROLE_KEY`      | ❌ NOOIT                 | ✅              | secret |
| `RESEND_API_KEY`                 | ❌ NOOIT                 | ✅              | secret |
| `LOVABLE_API_KEY`                | ❌ NOOIT                 | ✅              | secret |
| Toekomstige third-party keys     | ❌ NOOIT                 | ✅              | secret |

Volledige lijst: zie [`docs/env.md`](docs/env.md).

## Supabase service_role key — strikte regels

De **service_role** key omzeilt **alle** RLS policies (god mode). Eén lek = volledige database compromised. Daarom:

| Regel | Gehandhaafd door |
|---|---|
| 1. Komt **nooit** voor in `src/`, `public/`, `scripts/` of `docs/` | `scripts/scan-source-secrets.mjs` (vlagt zowel JWT-payload als de letterlijke string `SUPABASE_SERVICE_ROLE_KEY` buiten `supabase/functions/`) |
| 2. Komt **nooit** voor met een `VITE_*`-prefix (zou hem in de browser bundle exposen) | `src/lib/assert-no-service-role.ts` faalt bij app-startup als hij toch in `import.meta.env` zit |
| 3. Wordt **uitsluitend** gelezen via `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` in `supabase/functions/**` | Code review + bundle-scan (`scripts/scan-bundle-secrets.mjs`) |
| 4. Komt **nooit** voor in een gebouwde `dist/`-bundle | `scripts/scan-bundle-secrets.mjs` (run via `bash scripts/build-safe.sh` vóór deploy) |

Drie verdedigingslagen — als je er ooit één omzeilt, vangt de volgende laag het op:

```
[code]  scan-source-secrets   →  faalt vóór commit
[build] scan-bundle-secrets   →  faalt vóór deploy
[run]   assertNoServiceRoleInClient  →  faalt bij app-startup in browser
```

Bij een vermoeden van een lek: zie sectie "Wat te doen als er TOCH een secret is gelekt" hieronder — service_role key onmiddellijk roteren in Lovable Cloud → Database → API keys.



## Geautomatiseerde checks

Drie scanners draaien — twee voor je commit, één bij elke build/deploy:

| Wanneer | Tool | Wat |
|---|---|---|
| Voor build | `node scripts/scan-source-secrets.mjs` | Scant `src/`, `supabase/functions/`, `scripts/`, `public/`, `docs/` op key-patronen + losse `.env` files in repo root |
| Voor deploy | `bash scripts/build-safe.sh` | Bouwt en scant `dist/` zodat geen secret in de browser-bundle terechtkomt |
| Bij elke push/PR (CI) | `.github/workflows/secret-scan.yml` | Onze scanner + [gitleaks](https://github.com/gitleaks/gitleaks) over de **volledige git history** |

> Gitleaks vindt ook secrets die ooit zijn gecommit en later weer verwijderd — die staan namelijk nog in history.

## `.gitignore` aanvulling (lokaal)

De Lovable-omgeving beheert `.gitignore` automatisch en voegt geen `.env*` regel toe omdat er geen `.env` in de repo hoort. Als je het project lokaal kloont en zelf met `.env.local` wil werken, voeg dan toe:

```gitignore
# Local env files — NOOIT committen
.env
.env.*
!.env.example
.envrc
*.env
```

En commit een lege `.env.example` als template voor je teamleden.

## Wat te doen als er TOCH een secret is gelekt

1. **Roteer onmiddellijk** — vóór je iets anders doet:
   - Supabase **service role**: in Lovable → Cloud → Database → API keys → roteren
   - Supabase **anon key**: idem (komt automatisch in nieuwe `.env`)
   - **Resend**: dashboard.resend.com → API keys → revoke + nieuwe key → in Lovable Cloud → Connectors → Resend opnieuw verbinden
   - **Lovable AI key**: auto-beheerd, wordt automatisch geroteerd op verzoek aan Lovable support
2. **Check usage logs** op misbruik:
   - Resend dashboard → e-mail logs (onverwachte volumes?)
   - Supabase dashboard → API usage spike?
   - Eventueel billing alerts checken
3. **Verwijder de secret uit git history** (jij, lokaal):
   ```bash
   # Optie 1 — git-filter-repo (aanrader)
   pip install git-filter-repo
   git filter-repo --path path/to/leaked/file --invert-paths

   # Optie 2 — BFG Repo-Cleaner
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   git push --force
   ```
4. **Notify** je team dat ze een fresh clone moeten maken.
5. Voeg de geroteerde key toe aan **Lovable Cloud → Edge functions → Secrets**, niet aan de codebase.

## Eenmalige history-audit (lokaal)

Draai dit eenmaal op je gekloonde repo om er zeker van te zijn dat er nooit iets in history is gelekt:

```bash
# gitleaks (Go binary, brew install gitleaks)
gitleaks detect --source . --no-banner -v

# of trufflehog (pipx install trufflehog)
trufflehog git file://. --since-commit HEAD~1000 --only-verified
```

Vind je iets → ga naar stap "Wat te doen als er TOCH een secret is gelekt".

## Spending limits & budget alerts

Dit project draait op **Lovable Cloud** (Supabase + AI Gateway) en gebruikt **Resend** voor e-mail. Er zijn dus maar twee plekken waar kosten kunnen exploderen — en op beide kun je een harde cap instellen.

### Drempels (conservatief, MVP-fase)

| Niveau | Bedrag | Actie |
|---|---|---|
| ⚠️ Warn  | **€10**  | E-mail alert — usage checken in dashboard |
| 🟠 Alert | **€25**  | Onderzoek: welke endpoint/feature trekt het? |
| 🔴 Stop  | **€50**  | Hard cap: services worden gepauzeerd door provider |

> Pas deze later aan zodra je weet wat normaal verbruik is. De volledige stappen om ze te zetten staan in [`BUDGETS.md`](BUDGETS.md).

### Waar staan de caps

| Service | Dashboard | Wat te configureren |
|---|---|---|
| **Lovable Cloud + AI** | Lovable → Workspace settings → Cloud & AI balance | Hard spending cap + alert e-mail |
| **Resend** (e-mail) | [resend.com/settings/billing](https://resend.com/settings/billing) | Monthly sending limit + billing alerts |

### Wat te doen bij een budget-alert

1. **Identificeer de bron** (max 5 min)
   - Lovable Cloud → Edge Functions → Logs (welke function spikes?)
   - Resend dashboard → Emails (onverwacht hoog volume? Naar welk domein?)
   - Supabase → Database → Logs (query-spike? bot?)

2. **Stop de bloeding** (1 min, geen redeploy nodig)
   - Verdacht endpoint? → tijdelijk de Resend connector **disconnecten** in Lovable → Connectors. Edge functions die `RESEND_API_KEY` lezen falen dan netjes.
   - Verdachte user/IP? → blokkeer in `merchants` of `profiles` (zet `blocked = true`).
   - Bot-aanval op signup? → schakel tijdelijk e-mailbevestiging strikter in via Lovable Cloud → Auth.

3. **Check of er een leak is** (zie sectie hierboven)
   - Gitleaks lokaal draaien
   - Indien lek → keys roteren (zie "Wat te doen als er TOCH een secret is gelekt")

4. **Verhoog of verlaag de cap pas ná onderzoek** — niet uit reflex.

### Wat we NIET doen (en waarom)

- ❌ **Server-side rate limiting in edge functions** — Lovable Cloud heeft hier nog geen primitives voor; ad-hoc implementaties geven schijnveiligheid. Wachten tot er proper infra is.
- ❌ **Per-user token-quota's** — niet zinvol zolang we Lovable AI Gateway niet gebruiken voor user-facing AI features.
- ❌ **Aparte dev/prod Resend keys** — overkill voor MVP; de $0 free tier (3000/maand) is je natural cap.

## Vragen / vondsten

Open een private GitHub Security Advisory of mail de project owner. Maak géén public issue voor security-meldingen.
