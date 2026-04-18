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

## Vragen / vondsten

Open een private GitHub Security Advisory of mail de project owner. Maak géén public issue voor security-meldingen.
