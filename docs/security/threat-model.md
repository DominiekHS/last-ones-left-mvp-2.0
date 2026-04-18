# Threat model — Last Ones Left

> Doel: in 1 pagina weten **welke data we hebben**, **wat het ergste is dat kan gebeuren**, en **welke controls dat afdekken**. Geen paranoia — prioriteren.
>
> Scope: MVP (consumers + merchants + admins, geen payments yet). Herzien bij elke significante feature-uitbreiding (payments, externe API's, mobile app).

## 1. Data-assets

| Categorie | Concrete velden | Waar | Gevoeligheid |
|---|---|---|---|
| **PII consumer** | naam, e-mail, geboortedatum | `profiles`, `auth.users` | Hoog (AVG) |
| **PII merchant** | bedrijfsnaam, adres, postcode, contact-e-mail, telefoon | `merchants`, `auth.users` | Middel |
| **Auth** | gehashte wachtwoorden, sessies, JWT's | `auth.users` (Supabase-managed) | Kritisch |
| **Business — deals** | titel, beschrijving, prijzen, kortingscodes, checkout-links | `deals`, `unique_codes` | Middel — manipulatie = phishing-risico |
| **Business — claims** | wie heeft welke deal geclaimd, welke unieke code | `vouchers`, `claim_history`, `unique_codes` | Middel — fraude-risico bij lek |
| **Tracking** | views, clicks, conversies | `deal_events`, `deal_sales_daily` | Laag |
| **Storage** | deal-images, merchant-logos | Supabase Storage (`deal-images`, `merchant-logos`) | Laag (publiek leesbaar by design) |
| **Communicatie-logs** | admin↔merchant notities | `merchant_communications`, `admin_actions` | Middel |
| **App settings / panic switches** | `merchant_signup_enabled` | `app_settings` | Hoog — manipulatie = beschikbaarheidsimpact |

## 2. Wat is het ergste scenario?

| Scenario | Impact |
|---|---|
| **Service-role key lekt** | Volledige DB read/write, alle RLS bypassed. Game over. |
| **Database breach (SQL-injectie / misconfig)** | Mass exfiltratie van e-mails (spam/phishing-doelwitten), telefoonnummers merchants, kortingscodes (fraude). |
| **Admin account takeover** | Manipulatie deals (checkout-links naar phishing-sites), mass delete, merchant-status manipulatie. |
| **Merchant account takeover** | Phishing via `checkout_link`, andere merchants/consumers schade. |
| **Resend / e-mail key lekt** | Spam vanuit ons domein → blacklisting → legitieme auth-mails komen niet meer aan. |
| **Lovable AI key lekt** | Kostenexplosie tot spending cap (€50). |
| **Storage bucket misconfig** | Privé-uploads (paymentsteps-images) publiek vindbaar. |
| **Mass-delete via admin-fout** | Beschikbaarheid; te herstellen via PITR (max 24u dataverlies, zie [`backup.md`](../backup.md)). |

## 3. Top-10 risico's — Impact × Likelihood × Mitigation

Likelihood is een inschatting voor de huidige MVP-fase (kleine user base, geen payments, weinig externe aanvalsoppervlakte).

| # | Risico | Impact | Likelihood | Mitigation (waar) |
|---|---|:---:|:---:|---|
| 1 | service_role key lekt naar frontend bundle | 🔴 H | 🟢 L | 3-laagse defense: source-scan, bundle-scan, runtime-assert ([`SECURITY.md` §service_role](../../SECURITY.md#supabase-service_role-key--strikte-regels)) |
| 2 | RLS-gap op nieuwe tabel → data exposure | 🔴 H | 🟡 M | `audit:rls` script als release-gate ([`scripts/README.md`](../../scripts/README.md#rls--policy-audit-release-gate)) |
| 3 | AI-generated code introduceert open `SELECT *` op gevoelige tabel | 🟠 M | 🟡 M | `audit:queries` script ([`docs/query-guards.md`](../query-guards.md)) |
| 4 | Resend API key lekt → spam → blacklisting | 🔴 H | 🟢 L | Server-only key, daily-cap 200 mails, free-tier hard cap 3000/mnd ([`BUDGETS.md`](../../BUDGETS.md#-stap-2--resend-e-mail)) |
| 5 | Bot mass-signup → leegtrekken Resend quota | 🟠 M | 🟡 M | Supabase Auth rate-limits 30 signups/uur ([`BUDGETS.md` §3](../../BUDGETS.md#-stap-3--supabase-auth-rate-limits)) |
| 6 | Admin account takeover (zwak wachtwoord) | 🔴 H | 🟢 L | Leaked-password protection aan in Supabase; één admin account; backlog: MFA |
| 7 | Merchant manipuleert `checkout_link` → phishing | 🟠 M | 🟡 M | Merchant-status moderation flow (Geschorst/Geblokkeerd, [`mem://admin/moderation`](../../.lovable/memory/admin/moderation.md)); admin-review bij signup |
| 8 | Mass-delete door admin-fout | 🟠 M | 🟢 L | Soft-delete (`deleted_at`), `<DangerConfirmDialog>` met typebevestiging, PITR-backups ([`backup.md`](../backup.md)) |
| 9 | Mixed content / niet-HTTPS calls | 🟡 L | 🟢 L | Lovable forceert HTTPS auto; pre-launch checklist ([`custom-domain-launch.md`](../custom-domain-launch.md)) |
| 10 | Kostenexplosie Lovable AI / Cloud | 🟠 M | 🟢 L | Hard spending cap €50/mnd + alerts ([`BUDGETS.md`](../../BUDGETS.md)) |

> Bewust **niet** in top-10: DDoS (platform-laag is Lovable's verantwoordelijkheid), supply-chain attack via npm package (gedekt door `dependency_scan` policy in [`SECURITY.md` §dependency](../../SECURITY.md#dependency-auditing-policy)).

## 4. Wie informeren bij incident?

| Doelgroep | Wanneer | Hoe |
|---|---|---|
| **Co-founders + dev** | Altijd, direct (binnen minuten) | WhatsApp / Signal |
| **Merchants** | Bij compromise van merchant-data of checkout-links | E-mail via Resend (of handmatig als Resend zelf de bron is) |
| **Consumers** | Bij PII-leak (e-mail / geboortedatum / claim-history) | E-mail + banner op homepage |
| **AP (Autoriteit Persoonsgegevens)** | Verplicht binnen **72 uur** bij datalek met risico voor betrokkenen | [autoriteitpersoonsgegevens.nl/datalek-melden](https://www.autoriteitpersoonsgegevens.nl/melden/meldplicht-datalekken) |
| **Lovable support** | Bij vermoeden platform-issue | support@lovable.dev |

> **AVG-cruciaal**: een datalek met PII vereist melding bij de AP binnen 72 uur, ook als je nog niet zeker weet wat de scope is. Liever te vroeg melden dan te laat.

## 5. Mitigation-overzicht (defense in depth)

| Laag | Wat | Status |
|---|---|---|
| **Code (pre-commit)** | `scan-source-secrets`, `audit:queries` | ✅ Actief |
| **Build (pre-deploy)** | `scan-bundle-secrets`, `audit:rls` | ✅ Actief |
| **Runtime — frontend** | `assertNoServiceRoleInClient` startup-check, RLS-guarded queries, friendly errors | ✅ Actief |
| **Runtime — DB** | RLS op alle tabellen, `has_role()` security-definer, soft-delete, validation triggers | ✅ Actief ([`docs/rls.md`](../rls.md), [`docs/policies.md`](../policies.md)) |
| **Runtime — edge functions** | Input-validatie via shared validators, JWT-verify default aan | ✅ Actief ([`docs/api-security.md`](../api-security.md)) |
| **Ops** | Spending caps + alerts, dependency scan vóór deploy, daily backups | ✅ Actief ([`BUDGETS.md`](../../BUDGETS.md), [`backup.md`](../backup.md)) |
| **Account-laag** | Leaked-password protection, Auth rate-limits, role-based access | ✅ Actief |
| **Backlog (post-MVP)** | MFA voor admin, PITR-upgrade naar Pro, periodieke restore-drill, custom domain + HSTS | 🟡 Open |

## 6. Wanneer dit doc updaten?

- Nieuwe tabel of view toegevoegd → kolom 1 + 3 herzien
- Nieuwe externe provider (Stripe, OAuth, AI) → kolom 2 + 3 + 4 herzien
- Na een incident → lessons learned in §3
- Minimaal 1× per kwartaal review

## Verwante docs

- Incident runbook: [`incident-runbook.md`](./incident-runbook.md)
- Pre-deploy gate: [`release-checklist.md`](./release-checklist.md)
- Security policy + secret-rotatie: [`SECURITY.md`](../../SECURITY.md)
- Budget alerts: [`BUDGETS.md`](../../BUDGETS.md)
- Backup & restore: [`backup.md`](../backup.md)
