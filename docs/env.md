# Environment Variables

Dit document beschrijft alle environment variables die het project gebruikt, **waar** ze beschikbaar zijn (frontend/backend), en **wie** ze beheert.

## Belangrijk om te weten

- Dit project draait op **Lovable Cloud** (één Supabase-project): `otosschuqvmgymmdnawm`.
- Er is **één omgeving**. Preview en gepubliceerde site delen dezelfde database, edge functions en secrets.
  - Mocht je later willen splitsen in dev/prod: dan is een tweede Supabase-project nodig + handmatige migratie. Niet aan te raden tijdens de pilot.
- De frontend `.env` wordt **automatisch beheerd** door Lovable. Niet handmatig aanpassen.
- Alle "echte" secrets staan in **edge function secrets** (server-side), niet in de frontend.

---

## Frontend env vars (`VITE_*`)

Deze waarden zitten in de bundel die de browser downloadt. Ze zijn **publiek**.

| Naam                            | Type         | Waar gebruikt                                      | Mag in client? | Bron                |
|---------------------------------|--------------|----------------------------------------------------|----------------|---------------------|
| `VITE_SUPABASE_URL`             | URL          | `src/integrations/supabase/client.ts`              | ✅ Ja          | Auto (Lovable)      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | JWT (anon)   | `src/integrations/supabase/client.ts`              | ✅ Ja          | Auto (Lovable)      |
| `VITE_SUPABASE_PROJECT_ID`      | Tekst        | (informatief)                                      | ✅ Ja          | Auto (Lovable)      |

> **Regel:** zet hier **nooit** een private key, service_role JWT of provider-secret in. De build-time guard `bash scripts/build-safe.sh` controleert dit.

---

## Edge function secrets (server-side)

Deze waarden zijn **alléén** beschikbaar in `supabase/functions/*/index.ts` via `Deno.env.get(...)`. Ze komen nooit in de frontend bundel.

| Naam                          | Server-only | Gebruikt door                                                                    | Beheerd via                      |
|-------------------------------|-------------|----------------------------------------------------------------------------------|----------------------------------|
| `SUPABASE_URL`                | ✅          | `cleanup-vouchers`, `merchant-signup`, `send-deal-notifications`                 | Auto (Lovable Cloud)             |
| `SUPABASE_SERVICE_ROLE_KEY`   | ✅          | `cleanup-vouchers`, `merchant-signup`, `send-deal-notifications`                 | Auto (Lovable Cloud)             |
| `LOVABLE_API_KEY`             | ✅          | `send-contact-message`, `send-deal-notifications` (Resend gateway auth)          | Auto (Lovable AI Gateway)        |
| `RESEND_API_KEY`              | ✅          | `send-contact-message`, `send-deal-notifications` (e-mail verzenden)             | Lovable Cloud → Connectors → Resend |

> **Regel:** als je een nieuwe externe provider integreert (Stripe, OpenAI, etc.), zet de key **alleen** als edge function secret en roep de provider aan vanuit een edge function — nooit direct vanuit de browser.

---

## Verificatie

Twee tools controleren dat het bovenstaande klopt:

1. **Build-time** — `bash scripts/build-safe.sh` faalt als er een private key in `dist/` belandt.
2. **Runtime** — admin paneel → tab **Systeem** toont per service of de configuratie compleet is, zonder de waarden te tonen.

---

## Wat te doen bij rotatie

| Secret                        | Hoe roteren                                                       |
|-------------------------------|-------------------------------------------------------------------|
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Lovable Cloud → API keys roteren (anon key)                     |
| `SUPABASE_SERVICE_ROLE_KEY`   | Lovable Cloud → API keys roteren (service role)                   |
| `RESEND_API_KEY`              | Resend dashboard → key intrekken, nieuwe maken, in Connectors herverbinden |
| `LOVABLE_API_KEY`             | Auto-beheerd door Lovable                                         |

Na rotatie is geen herdeployment nodig — edge functions lezen de secrets bij elke invocation.
