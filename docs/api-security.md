# API Security Inventory

> **Architecturele kanttekening:** Deze app heeft géén traditionele API routes (geen Express/Next API). Alle data-toegang loopt via:
> 1. **Supabase RLS (Row Level Security)** — de `supabase-js` client praat direct met Postgres; toegang wordt per rij in de DB afgedwongen.
> 2. **Edge functions** — voor server-side logica die niet veilig vanuit de browser kan (e-mail versturen, admin-acties, signup met service role).
>
> "Middleware" betekent in dit project dus: (a) RLS policies en (b) `supabase/functions/_shared/auth.ts` helpers.

## Classificatie-regels

| Klasse | Definitie | Voorbeeld |
|---|---|---|
| **PUBLIC** | Read-only data die echt publiek mag zijn. Anon role mag SELECT. | actieve deals, help-categorieën |
| **PROTECTED** | User-eigen data. `auth.uid() = user_id`. | vouchers, profiel, claim_history |
| **MERCHANT** | Create/edit deals + merchant-profiel. `has_role(...,'merchant')` + ownership check. | deals INSERT/UPDATE, merchant logo |
| **ADMIN** | Dashboard, blokkeren, alle data inzien. `has_role(...,'admin')`. | admin-env-status, alle merchants/users |
| **COSTLY** | Triggert externe paid services (Resend mail, AI). Strikte auth + admin/owner check. | send-deal-notifications |
| **CRON** | Mag alleen door scheduled job. Header-based secret. | cleanup-vouchers |

---

## 1. Edge functions

| Function | Klasse | verify_jwt | In-code auth | Input validatie | Notes |
|---|---|---|---|---|---|
| `send-contact-message` | PUBLIC (form) | false | ❌ — bewust publiek | ✅ name/email/message length | Spam-risico beperkt door Resend free-tier cap (zie SECURITY.md). |
| `merchant-signup` | PUBLIC (signup) | false | ❌ — bewust publiek | ✅ alle velden + min length | Beveiligd via `app_settings.merchant_signup_enabled` feature flag. Service role nodig om auth-user aan te maken. |
| `admin-env-status` | ADMIN | false | ✅ `requireUser` + role check | n.v.t. (GET) | Gefixt vóór deze ronde. |
| `send-deal-notifications` | COSTLY | false | ✅ `requireUser` + admin OR owner | ✅ dealId | **Gefixt in #11**: was open, nu admin-of-owner-only. |
| `cleanup-vouchers` | CRON | false | ✅ `requireCronSecret` | n.v.t. | **Gefixt in #11**: was open, nu cron-only via `x-cron-secret` header. |

### Waarom `verify_jwt = false` op alle functions?

Lovable Cloud's signing-keys-systeem laat platform-level JWT-verificatie soms door valide tokens als ongeldig markeren. Beleid is: **`verify_jwt = false` + valideer in-code** via `requireUser()` / `requireRole()` uit `_shared/auth.ts`. Dit is veiliger want we hebben volledige controle over wat een geldige sessie betekent.

---

## 2. RLS-tabellen (directe DB-toegang via supabase-js)

| Tabel | Klasse | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `deals` | PUBLIC + MERCHANT | anon: `deleted_at IS NULL AND active`<br>auth: idem<br>merchant: own<br>admin: all | merchant: own + not blocked | merchant: own + not blocked<br>admin: any | merchant: own<br>admin: any (soft via `deleted_at`) |
| `merchants` | PUBLIC (subset cols) + MERCHANT | anon: active+!blocked, alleen pub kolommen<br>auth: idem<br>owner: own<br>admin: all | merchant own | merchant own + !blocked<br>admin: any | nooit (soft via `deleted_at`) |
| `vouchers` | PROTECTED | self<br>admin: all | self + has consumer role | nooit | nooit |
| `claim_history` | PROTECTED | self<br>admin: all | self via `claim_deal()` SECURITY DEFINER | nooit | nooit |
| `unique_codes` | PROTECTED + MERCHANT | merchant: own deal<br>consumer: own assigned<br>admin: all | merchant: own deal | merchant: own deal | merchant: own deal |
| `deal_events` | PROTECTED | merchant: own<br>admin: all | authenticated voor active deals | nooit | merchant: own |
| `deal_sales_daily` | MERCHANT | merchant: own<br>admin: all | merchant: own | merchant: own | merchant: own |
| `profiles` | PROTECTED | self<br>admin: all | self | self | nooit |
| `user_roles` | PROTECTED | self<br>admin: all | self → consumer only | nooit | nooit |
| `app_settings` | PUBLIC (read) + ADMIN | iedereen | admin | admin | nooit |
| `activity_requests` | PROTECTED | self<br>admin: all | self + consumer-role + length 2-300 | admin | admin |
| `merchant_communications` | ADMIN | admin | admin | admin | admin |
| `admin_actions` | ADMIN | admin | admin | admin | admin |
| `notification_log` | ADMIN | admin | nooit (alleen via service role in edge function) | nooit | nooit |
| `help_categories` / `help_articles` | PUBLIC + ADMIN | iedereen (gepubliceerd) | admin | admin | admin |

**Belangrijk:** `is_merchant_active(uuid)` en `has_role(uuid, app_role)` zijn `SECURITY DEFINER` functies — RLS-checks roepen ze veilig aan zonder dat anon role direct `merchants` of `user_roles` mag lezen.

---

## 3. Storage buckets

Zie [`docs/storage.md`](./storage.md). Samenvatting:

| Bucket | Klasse | Lezen | Schrijven |
|---|---|---|---|
| `deal-images` | PUBLIC read + MERCHANT write | iedereen | merchant in eigen folder |
| `merchant-logos` | PUBLIC read + MERCHANT write | iedereen | merchant in eigen folder |

---

## 4. Rate limiting — known gap

**Niet geïmplementeerd.** Lovable Cloud heeft (nog) geen rate-limiting primitives voor edge functions. Wat we wel hebben als demping:

- **Resend free-tier cap** (3000/maand) is een natuurlijke ceiling op `send-contact-message` en `send-deal-notifications`.
- **Spending caps** in Lovable Cloud + Resend (zie [SECURITY.md → Spending limits](../SECURITY.md#spending-limits--budget-alerts)).
- **`notification_sent_at` lock** voorkomt dubbele mail-runs voor dezelfde deal.
- **`merchant_signup_enabled` feature flag** kan signup direct dichtzetten bij een bot-wave.

Wanneer Lovable Cloud rate-limit primitives biedt: prioriteit voor `send-contact-message` (per IP) en `send-deal-notifications` (per merchant per uur).

---

## 5. Test-checklist (handmatig uit te voeren)

Vier rol-scenario's. Test telkens met `curl` of vanuit een incognito-tab als de juiste user.

### Setup

```bash
PROJECT_REF="otosschuqvmgymmdnawm"
ANON_KEY="<VITE_SUPABASE_PUBLISHABLE_KEY>"
URL="https://${PROJECT_REF}.supabase.co/functions/v1"
```

Krijg een JWT door te loggen met test-credentials (zie `mem://auth/credentials`):
```bash
TOKEN=$(curl -s "https://${PROJECT_REF}.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<email>","password":"<password>"}' | jq -r .access_token)
```

### A) Anon (geen token)

| Endpoint | Verwacht | Check |
|---|---|---|
| `GET /rest/v1/deals?select=*` met anon key | 200 + alleen actieve deals | ✅ ziet `Italiaans Restaurant` etc. |
| `POST /functions/v1/send-contact-message` | 200 (publiek form) | ✅ |
| `POST /functions/v1/admin-env-status` | 401 | ❌ `{"error":"Niet ingelogd"}` |
| `POST /functions/v1/send-deal-notifications` | 401 | ❌ |
| `POST /functions/v1/cleanup-vouchers` | 401 | ❌ `{"error":"Ongeldig cron-secret"}` |
| `INSERT INTO vouchers` via REST | 403 (RLS) | ❌ |

### B) Consumer

```bash
curl -X POST "$URL/admin-env-status" \
  -H "Authorization: Bearer $TOKEN" -H "apikey: $ANON_KEY"
# verwacht: 403 Geen toegang
```

| Endpoint | Verwacht |
|---|---|
| `SELECT vouchers WHERE user_id=mij` | 200 + eigen vouchers |
| `SELECT vouchers WHERE user_id=ander` | 200 + 0 rijen (RLS) |
| `POST /admin-env-status` | 403 |
| `POST /send-deal-notifications` | 403 (geen owner, geen admin) |
| `INSERT INTO deals` | 403 (RLS — geen merchant role) |

### C) Merchant (logged in als `merchant@lastleft.nl`)

| Endpoint | Verwacht |
|---|---|
| `SELECT deals WHERE merchant_id=mijn` | 200 + eigen deals |
| `UPDATE deals SET title=... WHERE id=eigen` | ✅ |
| `UPDATE deals SET title=... WHERE id=andere_merchant` | 0 rows (RLS) |
| `POST /send-deal-notifications {dealId: eigen}` | 200 |
| `POST /send-deal-notifications {dealId: andere_merchant}` | 403 |
| `POST /admin-env-status` | 403 |

### D) Admin (logged in als `admin@lastleft.nl`)

| Endpoint | Verwacht |
|---|---|
| `POST /admin-env-status` | 200 + checks summary |
| `SELECT * FROM merchants` | 200 + alle rijen |
| `POST /send-deal-notifications {dealId: any}` | 200 |
| `UPDATE merchants SET status='blocked' WHERE id=any` | ✅ |
| `POST /cleanup-vouchers` (geen secret) | 401 |

### E) Cron (CI of Supabase pg_cron)

```bash
curl -X POST "$URL/cleanup-vouchers" \
  -H "x-cron-secret: <CRON_SECRET>" -H "apikey: $ANON_KEY"
# verwacht: 200 + {marked_inactive, archived}
```

Zonder header → 401. Met verkeerde header → 401. ✅

---

## 6. Wat te doen bij een nieuw endpoint?

1. Voeg een rij toe aan tabel §1 of §2 hierboven.
2. Pak de juiste guard:
   - PUBLIC → geen auth, wel input-validatie + rate-limit-overweging
   - PROTECTED → `requireUser(req)` in edge function, of RLS `auth.uid() = user_id` in DB
   - MERCHANT/ADMIN → `requireRole(req, 'merchant'|'admin')`
   - CRON → `requireCronSecret(req)` + zet als secret in Lovable Cloud
3. Voeg expliciet toe aan `supabase/config.toml` met `verify_jwt = false` (we valideren altijd in-code).
4. Update test-checklist §5 met een rij voor het nieuwe endpoint.
