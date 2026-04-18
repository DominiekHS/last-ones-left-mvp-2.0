# Policy Matrix — least-privilege per tabel

> Status: bijgewerkt 2026-04-18 na security hardening #6.
>
> Aanvullend op [`docs/rls.md`](./rls.md) (RLS aan/uit + FORCE RLS). Dit document beschrijft **per tabel per actie** wie wat mag en waarom — inclusief bewuste keuzes om een actie hélemaal te blokkeren.

## Principes

1. **Geen `USING (true)` op gebruikersdata.** Alleen op publieke read-only content (`app_settings`, `help_*`).
2. **Eigenaarschap altijd via `auth.uid() = user_id`** of via SECURITY DEFINER helpers `is_deal_owner()` / `has_role()` (recursie-vrij).
3. **Anti-escalatie**: `user_roles` INSERT staat alleen `consumer` voor jezelf toe; `merchant`/`admin` worden server-side toegekend.
4. **Append-only**: `claim_history`, `vouchers`, `notification_log` hebben bewust géén UPDATE/DELETE policy — alleen via SECURITY DEFINER functies of service-role.
5. **Public read** op `deals` is gefilterd: alleen `expiry_time > now() AND merchant.blocked = false AND merchant.status = 'active'`.

## Legenda

- ✅ = expliciete policy aanwezig
- 🚫 = bewust géén policy (volledig dicht voor deze role)
- ⚙️ = alleen via SECURITY DEFINER function of service-role

## Matrix

### User-owned tabellen

#### `profiles` — eigen account-info
| Actie | anon | self | admin | Policy / Conditie |
|---|---|---|---|---|
| SELECT | 🚫 | ✅ | ✅ | `auth.uid() = user_id` / `has_role('admin')` |
| INSERT | 🚫 | ✅ | — | `auth.uid() = user_id` (trigger maakt rij bij signup) |
| UPDATE | 🚫 | ✅ | 🚫 | `auth.uid() = user_id` |
| DELETE | 🚫 | 🚫 | 🚫 | bewust dicht — accounts worden gedeactiveerd, nooit hard verwijderd |

#### `vouchers` — geclaimde kortingscodes
| Actie | anon | self (consumer) | admin |
|---|---|---|---|
| SELECT | 🚫 | ✅ | ✅ |
| INSERT | 🚫 | ✅ alleen consumer-rol | — |
| UPDATE | 🚫 | 🚫 | 🚫 ⚙️ via `claim_deal()` + `cleanup-vouchers` cron |
| DELETE | 🚫 | 🚫 | 🚫 |

#### `claim_history` — onveranderlijke claim-snapshots
| Actie | anon | self | admin |
|---|---|---|---|
| SELECT | 🚫 | ✅ | ✅ |
| INSERT | 🚫 | ✅ alleen via `claim_deal()` SECURITY DEFINER | — |
| UPDATE | 🚫 | 🚫 | 🚫 audit log |
| DELETE | 🚫 | 🚫 | 🚫 audit log |

#### `user_roles` — rolkoppelingen (anti-escalatie)
| Actie | anon | self | admin |
|---|---|---|---|
| SELECT | 🚫 | ✅ eigen | ✅ |
| INSERT | 🚫 | ✅ alleen `consumer` voor jezelf | ⚙️ `merchant`/`admin` via service-role |
| UPDATE | 🚫 | 🚫 | 🚫 nooit muteren — alleen INSERT/DELETE-by-recreate |
| DELETE | 🚫 | 🚫 | 🚫 |

#### `activity_requests` — feature requests van consumers
| Actie | anon | self (consumer) | admin |
|---|---|---|---|
| SELECT | 🚫 | ✅ eigen | ✅ |
| INSERT | 🚫 | ✅ msg 2-300 chars + consumer-rol | — |
| UPDATE | 🚫 | 🚫 | ✅ |
| DELETE | 🚫 | 🚫 | ✅ |

### Merchant-owned tabellen

#### `merchants` — bedrijfsprofielen
| Actie | anon | owner | merchant (anders) | admin |
|---|---|---|---|---|
| SELECT | ✅ via `merchants_public` view (zonder contact) | ✅ alle velden | ✅ basisvelden als niet blocked + active | ✅ alles |
| INSERT | 🚫 | ✅ alleen merchant-rol, eigen `user_id` | 🚫 | — |
| UPDATE | 🚫 | ✅ als niet blocked | 🚫 | ✅ |
| DELETE | 🚫 | 🚫 | 🚫 | 🚫 bewust — soft delete via `blocked = true` |

> Contact-velden (`contact_email`, `contact_phone`) staan **niet** in `merchants_public` view → niet zichtbaar voor anon → anti-scraping.

#### `deals` — advertenties
| Actie | anon | consumer | merchant (owner) | admin |
|---|---|---|---|---|
| SELECT | ✅ alleen actief + merchant.active + !blocked | ✅ + eigen geclaimde | ✅ alle eigen statussen | ✅ |
| INSERT | 🚫 | 🚫 | ✅ als niet blocked | — |
| UPDATE | 🚫 | 🚫 | ✅ als niet blocked | — |
| DELETE | 🚫 | 🚫 | ✅ eigen | ✅ |

#### `unique_codes` — pool van eenmalige codes
| Actie | anon | merchant (owner) | consumer (assignee) | admin |
|---|---|---|---|---|
| SELECT | 🚫 | ✅ eigen deals | ✅ alleen eigen toegewezen | ✅ |
| INSERT | 🚫 | ✅ eigen deals | 🚫 | — |
| UPDATE | 🚫 | ✅ eigen deals | ⚙️ via `claim_deal()` | — |
| DELETE | 🚫 | ✅ eigen deals | 🚫 | — |

#### `deal_events` — analytics tracking (views/clicks)
| Actie | anon | authenticated | merchant (owner) | admin |
|---|---|---|---|---|
| SELECT | 🚫 | 🚫 | ✅ eigen | ✅ |
| INSERT | ✅ als deal nog actief is | ✅ idem | ✅ | — |
| UPDATE | 🚫 | 🚫 | 🚫 | 🚫 |
| DELETE | 🚫 | 🚫 | ✅ eigen | — |

> **Bewust permissieve INSERT**: anon mag tracking-events insturen, maar alleen als de deal actief is en `user_id` ofwel NULL ofwel `auth.uid()` is.

#### `deal_sales_daily` — handmatige verkoop-invoer per merchant
| Actie | anon | merchant (owner) | admin |
|---|---|---|---|
| SELECT/INSERT/UPDATE/DELETE | 🚫 | ✅ eigen deals | SELECT ✅ |

### Admin-only tabellen

#### `admin_actions` — audit log
| Actie | anon | authenticated | admin |
|---|---|---|---|
| ALL | 🚫 | 🚫 | ✅ |

#### `merchant_communications` — gesprek-log met merchants
| Actie | anon | authenticated | admin |
|---|---|---|---|
| ALL | 🚫 | 🚫 | ✅ |

#### `notification_log` — e-mail batch-log
| Actie | anon | authenticated | admin |
|---|---|---|---|
| SELECT | 🚫 | 🚫 | ✅ |
| INSERT/UPDATE/DELETE | 🚫 | 🚫 | 🚫 ⚙️ alleen via service-role edge function |

### Publiek read-only tabellen

#### `app_settings` — UI-instellingen, feature flags
| Actie | anon | authenticated | admin |
|---|---|---|---|
| SELECT | ✅ `USING (true)` | ✅ | ✅ |
| INSERT | 🚫 | 🚫 | ✅ |
| UPDATE | 🚫 | 🚫 | ✅ |
| DELETE | 🚫 | 🚫 | 🚫 — keys worden nooit verwijderd, alleen ge-update |

> Bewust publiek leesbaar: bevat alleen niet-gevoelige UI-tekstjes en flags. Geen secrets, geen PII.

#### `help_categories` & `help_articles` — helpcentrum
| Actie | anon | authenticated | admin |
|---|---|---|---|
| SELECT | ✅ (alleen `is_published = true` voor articles) | ✅ | ✅ ALL |
| INSERT/UPDATE/DELETE | 🚫 | 🚫 | ✅ via ALL-policy |

> Bewust publiek: helpcentrum moet ook zonder login werken.

## Test-scenarios per rol

Handmatig testen vanuit de browser-console of via een test-suite. Verwacht resultaat:

### anon (uitgelogd)
| Query | Verwacht |
|---|---|
| `select * from vouchers` | 0 rows |
| `select * from claim_history` | 0 rows |
| `select * from profiles` | 0 rows |
| `select * from user_roles` | 0 rows |
| `select * from deals where expiry_time > now()` | actieve deals van non-blocked merchants |
| `select contact_email from merchants` | 0 rows / NULL |
| `select * from merchants_public` | basis-info, geen contact |
| `select * from app_settings` | alle keys (publiek by design) |
| `insert into vouchers ...` | error (RLS) |
| `insert into deal_events (deal_id, event_type) values (...)` | OK voor actieve deal, error voor expired |

### consumer (ingelogd, role = consumer)
| Query | Verwacht |
|---|---|
| `select * from vouchers where user_id = me` | eigen rows |
| `select * from vouchers where user_id != me` | 0 rows |
| `select * from claim_history where user_id = me` | eigen rows |
| `update profiles set full_name='X' where user_id = me` | OK |
| `insert into deals ...` | error |
| `insert into user_roles (user_id, role) values (me, 'admin')` | error (alleen 'consumer' toegestaan) |

### merchant (ingelogd, role = merchant)
| Query | Verwacht |
|---|---|
| `select * from deals where merchant_id = mine` | alle eigen deals |
| `select * from deals where merchant_id != mine` | alleen actieve + active+!blocked |
| `update deals set price = ... where merchant_id != mine` | error |
| `select * from vouchers` | 0 rows (merchants kennen geen claims) |
| `select * from deal_events where deal_id in (mine)` | eigen analytics |

### admin (ingelogd, role = admin)
| Query | Verwacht |
|---|---|
| `select * from profiles` | alles |
| `select * from vouchers` | alles |
| `select * from admin_actions` | alles |
| `select * from merchant_communications` | alles |
| `delete from admin_actions where id = ...` | OK |

## Release-gate (CI)

`scripts/audit-rls.mjs` controleert bij elke run:

1. **RLS aan** op alle public tabellen.
2. **Policies bestaan** voor SELECT/INSERT/UPDATE/DELETE — tabellen zonder policy voor een actie krijgen een waarschuwing tenzij ze in `INTENTIONAL_BLOCKS` staan (bv. `vouchers` heeft bewust geen UPDATE/DELETE-policy).
3. Faalt met exit 1 als een tabel RLS mist of een onverwachte action-gap heeft.

Run lokaal:
```bash
export SUPABASE_DB_URL='postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres'
npm run audit:rls
```

## Wijzigingsproces

Nieuwe tabel toevoegen? Checklist:

1. `ALTER TABLE public.<naam> ENABLE ROW LEVEL SECURITY;`
2. (User-data?) `ALTER TABLE public.<naam> FORCE ROW LEVEL SECURITY;`
3. Policy per actie: SELECT/INSERT/UPDATE/DELETE expliciet — geen `USING (true)` tenzij echt publiek.
4. Voeg toe aan deze matrix.
5. Voeg eventueel toe aan `INTENTIONAL_BLOCKS` in `scripts/audit-rls.mjs` als bepaalde acties bewust dicht zijn.
6. Run `npm run audit:rls` en verifieer ✅.
