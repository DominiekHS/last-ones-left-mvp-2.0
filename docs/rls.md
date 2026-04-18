# Row Level Security — access matrix

Status: bijgewerkt 2026-04-18 na security hardening #5 (FORCE RLS + audit-script).

> **Regel:** elke tabel in `public` heeft RLS aanstaan. Geen enkele policy gebruikt `USING (true)` op gebruikersdata. Roltoekenning wordt **alleen** server-side gedaan voor `merchant` en `admin`.
>
> **FORCE RLS** staat aan op 12 user-data tabellen. Bewust **niet** op `claim_history`, `vouchers`, `unique_codes`, `notification_log` — die worden geschreven via SECURITY DEFINER functies / service-role edge functions.
>
> **Release-gate:** `npm run audit:rls` (zie `scripts/README.md`) faalt als een tabel zonder RLS bestaat.

## Legenda

| Rol | Wat |
|---|---|
| **anon** | Niet ingelogde bezoeker |
| **owner** | Ingelogde gebruiker die rij bezit (`auth.uid() = user_id` of via `is_deal_owner`) |
| **consumer** | Ingelogde user met `consumer` role |
| **merchant** | Ingelogde user met `merchant` role |
| **admin** | Ingelogde user met `admin` role |

✅ = toegestaan · ❌ = geblokkeerd · — = n.v.t.

---

## Per tabel

### `merchants`
| Operatie | anon | owner | merchant (anders) | admin | Voorwaarde |
|---|---|---|---|---|---|
| SELECT (basisvelden) | ✅ via view `merchants_public` | ✅ alle velden | ✅ basisvelden | ✅ alles | view filtert blocked + status |
| SELECT (contact_email/phone) | ❌ | ✅ | ✅ via base table | ✅ | base table policy |
| INSERT | ❌ | ✅ eigen | ❌ | — | `auth.uid() = user_id` |
| UPDATE | ❌ | ✅ als niet blocked | ❌ | ✅ | |
| DELETE | ❌ | ❌ | ❌ | ❌ | bewust geen DELETE-policy |

> **Beveiliging tegen scrapen**: `merchants_public` view bevat geen contactgegevens. Anonieme gebruikers kunnen alleen e-mail/telefoon zien als ze inloggen.

### `user_roles`
| Operatie | anon | self | admin | Voorwaarde |
|---|---|---|---|---|
| SELECT | ❌ | ✅ eigen | ✅ alles | |
| INSERT | ❌ | ✅ alleen `consumer` voor zichzelf | (server-side) | `merchant` & `admin` worden via edge function met service-role toegekend |
| UPDATE | ❌ | ❌ | ❌ | bewust geen UPDATE-policy |
| DELETE | ❌ | ❌ | ❌ | bewust geen DELETE-policy |

> **Privilege escalation**: niet mogelijk vanaf de client. `merchant` rol gaat via `merchant-signup` edge function; `admin` rollen worden handmatig toegevoegd door bestaande admin met service-role toegang.

### `profiles`
| Operatie | anon | self | admin |
|---|---|---|---|
| SELECT | ❌ | ✅ | ✅ |
| INSERT | ❌ | ✅ eigen | — |
| UPDATE | ❌ | ✅ eigen | — |
| DELETE | ❌ | ❌ | ❌ |

### `deals`
| Operatie | anon | consumer (claimer) | merchant (owner) | admin |
|---|---|---|---|---|
| SELECT (actief) | ✅ als merchant active+!blocked en niet expired | ✅ + eigen geclaimde | ✅ eigen | ✅ alles |
| INSERT | ❌ | ❌ | ✅ als niet blocked | — |
| UPDATE | ❌ | ❌ | ✅ als niet blocked | — |
| DELETE | ❌ | ❌ | ✅ eigen | ✅ |

### `vouchers`
| Operatie | anon | self (consumer) | admin |
|---|---|---|---|
| SELECT | ❌ | ✅ eigen | ✅ |
| INSERT | ❌ | ✅ alleen consumers, eigen rij | — |
| UPDATE/DELETE | ❌ | ❌ | ❌ |

> Updates gebeuren alleen via `claim_deal` SECURITY DEFINER function en via cleanup-vouchers cron edge function.

### `claim_history`
| Operatie | anon | self | admin |
|---|---|---|---|
| SELECT | ❌ | ✅ eigen | ✅ |
| INSERT | ❌ | ✅ eigen (door `claim_deal` function) | — |
| UPDATE/DELETE | ❌ | ❌ | ❌ |

### `unique_codes`
| Operatie | anon | merchant (owner) | consumer (assignee) | admin |
|---|---|---|---|---|
| SELECT | ❌ | ✅ eigen deals | ✅ eigen toegewezen | ✅ |
| INSERT | ❌ | ✅ eigen deals | ❌ | — |
| UPDATE | ❌ | ✅ eigen deals | (door `claim_deal` SECURITY DEFINER) | — |
| DELETE | ❌ | ✅ eigen deals | ❌ | — |

### `deal_events` (analytics tracking)
| Operatie | anon | merchant (owner) | admin |
|---|---|---|---|
| SELECT | ❌ | ✅ eigen | ✅ |
| INSERT | ✅ als deal nog actief is | ✅ | — |
| DELETE | ❌ | ✅ eigen | — |

> **Bewust permissief**: anon mag INSERT zodat we views/clicks kunnen tellen voor uitgelogde bezoekers.

### `deal_sales_daily`
| Operatie | anon | merchant (owner) | admin |
|---|---|---|---|
| SELECT/INSERT/UPDATE/DELETE | ❌ | ✅ eigen | SELECT ✅ |

### `merchant_communications`
| Operatie | anon | merchant | admin |
|---|---|---|---|
| ALL | ❌ | ❌ | ✅ |

### `admin_actions`
Alleen admin (audit log).

### `notification_log`
SELECT alleen admin; INSERT/UPDATE/DELETE volledig dichtgetimmerd (alleen via service-role).

### `app_settings`
| Operatie | anon | authenticated | admin |
|---|---|---|---|
| SELECT | ✅ | ✅ | ✅ |
| INSERT/UPDATE | ❌ | ❌ | ✅ |

> **Bewust publiek leesbaar**: bevat alleen niet-gevoelige UI-instellingen (tekstjes, vlaggen).

### `help_categories` & `help_articles`
| Operatie | anon | authenticated | admin |
|---|---|---|---|
| SELECT | ✅ | ✅ | ✅ |
| ALL overige | ❌ | ❌ | ✅ |

> **Bewust publiek**: helpcentrum moet ook zonder login werken.

### `activity_requests`
| Operatie | anon | self (consumer) | admin |
|---|---|---|---|
| SELECT | ❌ | ✅ eigen | ✅ alles |
| INSERT | ❌ | ✅ alleen consumers, msg 2-300 chars | — |
| UPDATE/DELETE | ❌ | ❌ | ✅ |

---

## SECURITY DEFINER functions

Alle hebben `SET search_path = public` om search-path injection te voorkomen.

| Function | Doel |
|---|---|
| `has_role(uuid, app_role)` | Recursie-vrije rolcheck in policies |
| `is_deal_owner(uuid, uuid)` | Recursie-vrije ownership check |
| `claim_deal(uuid, uuid)` | Atomic claim + voucher + history insert |
| `archive_vouchers_on_deal_renewal()` | Trigger bij deal-renewal |
| `handle_new_user()` | Trigger: profielrij maken bij signup |
| `update_updated_at_column()` | Generieke updated_at trigger |

---

## Storage buckets

| Bucket | Public | Toelichting |
|---|---|---|
| `deal-images` | ✅ | Bewust publiek leesbaar — deal-foto's worden in `<img>` tags getoond |
| `merchant-logos` | ✅ | Bewust publiek leesbaar — logos worden in headers/cards getoond |

> Listing van bucket-inhoud is mogelijk (zie linter warning 0025). Acceptabel risico: bestandsnamen zijn UUIDs zonder informatie. Schrijf-policies zijn wel scoped op merchant/admin.

---

## Externe linter-warnings die niet via SQL op te lossen zijn

| Warning | Status | Actie |
|---|---|---|
| `Leaked Password Protection Disabled` | Open | Handmatig in Supabase dashboard → Auth → Password aanzetten |
| `Public Bucket Allows Listing` (deal-images, merchant-logos) | Geaccepteerd | Bewuste keuze, zie hierboven |
