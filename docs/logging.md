# Logging & audit events

> Fase 1+2 van de observability roadmap. Geen externe vendor (geen Sentry/LogSnag) — alles draait binnen Lovable Cloud.

## Drie schrijfpaden

| Bron | Helper | Tabel | Wie kan lezen |
|---|---|---|---|
| Edge function (server-side) | `recordAuditEvent()` uit `supabase/functions/_shared/audit.ts` | `audit_log` | admins |
| Browser → publiek endpoint | `logAuthEvent()` uit `src/lib/audit.ts` → POST naar `log-auth-event` | `audit_log` | admins |
| Browser, ingelogde user | `recordAuditEvent()` uit `src/lib/audit.ts` | `audit_log` | admins |
| Browser, admin moderation | `recordAdminAction()` uit `src/lib/audit.ts` | `admin_actions` (bestaand) | admins |

## Event-namen (whitelist)

Houd de naamgeving stabiel — alerts en queries hangen ervan af.

| event_name | Bron | severity |
|---|---|---|
| `AUTH_LOGIN_FAILED` | `Login.tsx` → `log-auth-event` | warn |
| `AUTH_PASSWORD_RESET_REQUESTED` | `ForgotPassword.tsx` → `log-auth-event` | warn |
| `AUTH_SIGNUP_FAILED` | (toekomst) | warn |
| `DEAL_PUBLISHED` | merchant deal create/edit (TODO) | info |
| `VOUCHER_CLAIMED` | reeds gedekt door `claim_history` snapshot | info |
| `ADMIN_ACTION` | `admin_actions` tabel | info/warn |

## Wat NOOIT loggen

De logger (`supabase/functions/_shared/logger.ts`) scrubt automatisch:

- `password`, `token`, `access_token`, `refresh_token`, `authorization`, `apikey`, `api_key`, `secret`, `service_role(_key)`, `email`
- Strings > 500 chars worden ge-truncate

Aanvullend handmatig:

- ❌ Geen raw IPs → gebruik `hashIp()` (SHA-256, 128 bits)
- ❌ Geen e-mailadressen → log `email_length` voor sanity-checks
- ❌ Geen request bodies → log alleen `payload_size`, `endpoint`, `status_code`

## Querying logs

In Lovable Cloud → SQL editor (of via `supabase--analytics_query`):

```sql
-- Login-failures laatste uur, per IP-hash
select ip_hash, count(*) as attempts
from audit_log
where event_name = 'AUTH_LOGIN_FAILED'
  and created_at > now() - interval '1 hour'
group by ip_hash
having count(*) >= 5
order by attempts desc;
```

```sql
-- Password-reset spikes laatste 10 min
select date_trunc('minute', created_at) as minute, count(*)
from audit_log
where event_name = 'AUTH_PASSWORD_RESET_REQUESTED'
  and created_at > now() - interval '10 minutes'
group by minute
order by minute;
```

```sql
-- Admin actions audit trail
select created_at, action_type, target_type, target_id, reason
from admin_actions
where admin_id = '<uuid>'
order by created_at desc
limit 50;
```

## Edge function logger gebruiken

```ts
import { createLogger, getClientIp, hashIp } from "../_shared/logger.ts";
import { recordAuditEvent } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  const log = createLogger("merchant-signup", req);

  log.info("SIGNUP_ATTEMPT", { source: "web" });

  // ... validation, business logic ...

  if (failure) {
    const ip_hash = await hashIp(getClientIp(req) ?? "");
    log.warn("SIGNUP_FAILED", { reason: "duplicate_email" });
    await recordAuditEvent({
      event_name: "AUTH_SIGNUP_FAILED",
      severity: "warn",
      ip_hash,
      endpoint: "merchant-signup",
      request_id: log.context.request_id,
      metadata: { reason: "duplicate_email" },
    });
  }
});
```

Output (single-line JSON, makkelijk te grep'en):

```json
{"timestamp":"2025-...","level":"warn","event_name":"SIGNUP_FAILED","endpoint":"merchant-signup","request_id":"a1b2c3d4","metadata":{"reason":"duplicate_email"}}
```

## Alerts (handmatig, MVP)

We hebben **geen** automatische alerting (geen Sentry/PagerDuty). Tot we daar zijn:

1. Open elke 1-2 dagen Lovable Cloud → Edge Functions → Logs
2. Run de queries hierboven via SQL editor
3. Bij spikes → controleer IP-hash, blokkeer indien nodig via `merchants.blocked = true` of contact support

Wanneer Sentry / Resend daily digest aansluiten: zie roadmap Fase 3.

## Niet inbegrepen (bewust)

- ❌ Server-side rate-limit tellers — Lovable Cloud heeft geen primitives, ad-hoc geeft schijnveiligheid (zie `SECURITY.md`)
- ❌ Sentry / LogSnag — vendor-keuze uitgesteld tot eerste echte gebruikers
- ❌ Admin "Systeemstatus" dashboard — overkill in MVP, query gewoon de DB
