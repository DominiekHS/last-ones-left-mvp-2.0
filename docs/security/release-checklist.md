# Security release checklist — go/no-go vóór elke productie-deploy

> 1 pagina. 12 checks. Alles ✅ → deploy. Eén ❌ → fix eerst.
>
> Volledige policy + waarom: [`SECURITY.md`](../../SECURITY.md). Threat model: [`threat-model.md`](./threat-model.md).

## Pre-flight (5 min)

> **Verplichte gate-commando:** `bash scripts/build-safe.sh` dekt items **#1, #3 en #12** in één run (error-mapping tests → frontend build → bundle-scan). Exit 0 is non-negotiable. Geen alternatieve commando's, geen "ik draai alleen `npm run build`".

- [ ] **1. RLS staat aan op alle public tabellen + policies dekken alle nodige acties**
  → `bash scripts/build-safe.sh` → exit 0 (verplicht — draait o.a. `npm run audit:rls` equivalent via tests + scans)
  → Aanvullende deep-check bij twijfel: `npm run audit:rls`
  → Onverwachte gaps? Check [`docs/policies.md`](../policies.md), update `INTENTIONAL_BLOCKS` indien bewust dicht.

- [ ] **2. Geen risicovolle queries in frontend code**
  → `npm run audit:queries` → exit 0
  → Bv. `.from("vouchers").select("*")` zonder ownership-filter is een blocker.

- [ ] **3. Geen secrets in source of build-output**
  → `bash scripts/build-safe.sh` → exit 0 (verplicht — combineert security-tests + build + bundle-scan + source-scan)
  → Service_role JWT, Resend `re_…`, OpenAI `sk-…` etc. mogen nergens in `dist/` of `src/` staan.

- [ ] **4. Service-role key wordt nergens client-side geladen**
  → `assertNoServiceRoleInClient` faalt anders bij app-start; check console na deploy ook visueel.

- [ ] **5. Dependency audit groen**
  → Lovable dependency scan / `npm audit` → 0 high/critical
  → Geaccepteerde risico's (indien) staan gedocumenteerd in [`SECURITY.md` §"Geaccepteerde risico's"](../../SECURITY.md#geaccepteerde-risicos).

- [ ] **6. Edge functions hebben input-validatie**
  → Check dat nieuwe functions `validate*` helpers uit `supabase/functions/_shared/validation.ts` gebruiken.
  → Beleid: [`docs/api-security.md`](../api-security.md).

- [ ] **7. Admin-only endpoints zijn role-gated**
  → Admin actions checken `has_role(auth.uid(), 'admin')` zowel in RLS als in edge functions (`requireAdminUser` helper).
  → Geen admin-functionaliteit blootgesteld via consumer/merchant rollen.

## Operationele gates

- [ ] **8. Spending caps + alerts staan ingesteld**
  → Lovable Cloud + AI balance: hard cap €50/mnd, alerts €10/€25/€40
  → Resend: free-tier (3000/mnd) + billing alerts $10/$25/$50
  → Setup: [`BUDGETS.md`](../../BUDGETS.md). Eenmalig — verifieer 1× per kwartaal.

- [ ] **9. Backups + (indien mogelijk) PITR aangezet**
  → Supabase Dashboard → Database → Backups: dagelijkse backup zichtbaar
  → Pro-plan + PITR aanbevolen zodra betalende klanten in productie zitten
  → Restore-procedure getest: [`docs/backup.md` §7](../backup.md#7-restore-test-log) (mag staging zijn, niet prod)

- [ ] **10. Auth-config**
  → Leaked-password protection AAN (Supabase Dashboard → Auth → Password protection)
  → E-mail confirmation AAN (geen anonymous signups)
  → Auth rate-limits: 30 signups/uur, 30 OTP/uur ([`BUDGETS.md` §3](../../BUDGETS.md#-stap-3--supabase-auth-rate-limits))

## Bij custom domain launch (eenmalig)

- [ ] **11. Custom domain checklist doorlopen**
  → [`docs/custom-domain-launch.md`](../custom-domain-launch.md) stappen 1–5 ✅
  → Site URL + Redirect URLs in Lovable Cloud → Auth bijgewerkt naar `https://<domein>`
  → Post-launch verificatie: HTTPS-redirect werkt, geen mixed-content, auth-mails wijzen naar nieuw domein.

## User-facing safety

- [ ] **12. Error-messages zijn gesanitiseerd**
  → `bash scripts/build-safe.sh` → exit 0 (verplicht — draait `friendly-errors.test.ts` met 25 mapping-asserties incl. lek-checks op kolom-/constraint-namen)
  → Geen stack traces of DB-fouten zichtbaar voor users (gebruik `friendlyAuthError` / `friendlyDbError` helpers in `src/lib/friendly-errors.ts`).
  → ErrorBoundary actief op app-niveau (zie `src/components/ErrorBoundary.tsx`).

---

## Wat NIET op de checklist staat (en waarom)

| Item | Waarom geen blocker |
|---|---|
| Server-side rate limiting in edge functions | Lovable Cloud heeft hier geen primitives voor; Supabase Auth rate-limits dekken het signup-vector. Zie [`SECURITY.md` §"Wat we NIET doen"](../../SECURITY.md#wat-we-niet-doen-en-waarom). |
| CORS allowlist hardenen | Geen cookies; auth via `Authorization: Bearer`. CORS biedt weinig extra in onze setup. |
| HSTS-header | Lovable hosting beheert response headers; HTTPS-redirect + auto-cert dekt het gros. Backlog voor later. |
| MFA voor admin | Eén admin-account in MVP; backlog-item voor zodra meerdere admins of betalende klanten. |
| Aparte staging Resend account | Free-tier (3000/mnd) is natuurlijke cap; overkill voor MVP. |

---

## Workflow

1. Voor elke deploy: loop deze 12 punten af.
2. Vink af in de PR-beschrijving / deploy-notitie.
3. Eén ❌ → fix eerst, niet "we doen het volgende keer wel".
4. Nieuwe risico's geleerd uit incident → checklist uitbreiden, niet inkorten.

## Verwante docs

- Threat model (waarom deze checks): [`threat-model.md`](./threat-model.md)
- Wat te doen bij incident: [`incident-runbook.md`](./incident-runbook.md)
- Volledige security policy: [`SECURITY.md`](../../SECURITY.md)
- Budget/spending setup: [`BUDGETS.md`](../../BUDGETS.md)
- Backup/restore: [`backup.md`](../backup.md)
