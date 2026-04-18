# Query & Auth Guards — belt & suspenders

> Status: bijgewerkt 2026-04-18 na security hardening #7.
>
> Dit document beschrijft hoe we client-side queries beveiligen **bovenop** Row Level Security (RLS).

## Onze security-laag

| Laag | Verantwoordelijkheid | Authoritatief? |
|---|---|---|
| **Row Level Security (DB)** | Bepaalt of een query data terug mag geven | ✅ ja — bron van waarheid |
| **Expliciete `.eq("user_id", ...)` filters** | Belt & suspenders + duidelijkheid in code | ❌ verdediging in diepte |
| **`useRequireAuth` / `useRequireRole` hooks** | UX: redirect naar /login bij ontbrekende sessie | ❌ alleen UX |
| **Audit-script `npm run audit:queries`** | CI-gate: blokkeert build bij open queries | ✅ release gate |

## Waarom géén server-side wrappers (edge function per fetch)?

Prompt #7 stelt voor om gevoelige queries naar server-side endpoints te verplaatsen. **Wij doen dit bewust niet** omdat:

1. **RLS is al server-side**: Postgres RLS draait in de DB zelf en kan niet bypassed worden vanuit de client met de anon key. Een edge function-wrapper voegt geen extra security toe — het is dezelfde check.
2. **Dubbele complexiteit**: elke nieuwe feature zou twee implementaties krijgen (RLS-policy + edge function), met risico op divergentie.
3. **Lovable's officiële pattern is RLS-first**: zie [docs/rls.md](./rls.md) en [docs/policies.md](./policies.md).

Service-role keys (die RLS bypassen) gebruiken we **alleen** voor:
- E-mail verzending (`send-deal-notifications`, `send-contact-message`)
- Cron jobs (`cleanup-vouchers`)
- Merchant signup met service-role rolkoppeling (`merchant-signup`)

## Auth guards (UX-laag)

Twee hooks in `src/hooks/useAuthGuard.ts`:

### `useRequireAuth({ redirectTo? })`

```tsx
function PrivatePage() {
  const { allowed, loading } = useRequireAuth();
  if (loading) return <Skeleton />;
  if (!allowed) return null;        // redirect is al getriggerd
  return <PrivateContent />;
}
```

- Niet ingelogd → redirect naar `/login` (of `redirectTo`)
- `silent: true` → geen redirect, alleen `allowed` boolean (handig voor inline UI)

### `useRequireRole(role, { redirectTo? })`

```tsx
function AdminPage() {
  const { allowed, loading } = useRequireRole("admin", { redirectTo: "/" });
  if (loading) return <Skeleton />;
  if (!allowed) return null;
  return <AdminContent />;
}
```

- Geen sessie → `/login`
- Sessie maar verkeerde rol → `redirectTo` (default `/`)

> **Belangrijk**: deze hooks zijn **opt-in** voor nieuwe pagina's. Bestaande pagina's gebruiken inline `useAuth()` checks (die werken net zo goed). RLS is altijd de echte beveiliging — deze hooks voorkomen alleen dat een user een lege pagina ziet.

## Expliciete query-filters (belt & suspenders)

Voor alle queries op user-data (consumer eigen data, merchant eigen data):

```ts
// ✅ goed — expliciete filter, ook al doet RLS dit ook
const { data } = await supabase
  .from("claim_history")
  .select("title, claimed_at")
  .eq("user_id", user.id)
  .order("claimed_at", { ascending: false });

// ⚠️ werkt door RLS, maar maakt intent onduidelijk + faalt audit-script
const { data } = await supabase
  .from("claim_history")
  .select("title, claimed_at")
  .order("claimed_at", { ascending: false });
```

**Mutaties** (`insert`/`update`/`delete`) moeten een ownership-payload of `.eq()` op `id`/`user_id`/`merchant_id` bevatten.

## Audit-script: `npm run audit:queries`

Scant alle `.ts`/`.tsx` files in `src/` op risicovolle patronen:

1. `.from("<gevoelige_tabel>")` zonder ownership-filter in dezelfde chain
2. Mutaties op gevoelige tabellen zonder `user_id`/`merchant_id` in payload of `.eq()`

**Allowlist** (in `scripts/audit-queries.mjs`):
- `src/pages/admin/**` en `src/components/admin/**` — RLS dwingt `has_role('admin')` af, geen extra filter nodig
- `src/hooks/useAuth.tsx` — bootstrap fetch eigen data
- `src/hooks/useMerchantProfile.ts` — filtert op `merchantId` voor publieke profielen

**Public tables** (geen audit):
- `deals` — public read, RLS filtert op `expiry_time > now()` + non-blocked merchant
- `merchants_public` — view zonder contact-velden
- `app_settings`, `help_categories`, `help_articles` — bewust publiek

### Output bij succes
```
🔍 Query audit — 118 TS/TSX files gescand

ℹ️  5 match(es) op allowlist (OK):
   · src/pages/admin/AdminDashboard.tsx:69 → user_roles  [Admin route]
   ...

✅ Geen risicovolle queries gevonden. RLS + expliciete filters in orde.
```

### Output bij falen
```
❌ 1 verdachte query zonder ownership-filter:
   src/pages/consumer/MijnPagina.tsx:42
     table: vouchers
     near:  .from("vouchers").select("*").order(...)…

Fix opties:
  1. Voeg een expliciete filter toe: .eq('user_id', user.id) ...
  2. Verplaats naar src/pages/admin/ als het admin-only is.
  3. Zet op de ALLOWLIST in scripts/audit-queries.mjs met motivering.
```

## Combineerd commando

```bash
# Draait beide audits achter elkaar
npm run audit:all
```

Equivalent aan: `npm run audit:queries && npm run audit:rls`.

## Wijzigingsproces

Nieuwe query op een gevoelige tabel toevoegen? Checklist:

1. Voeg expliciete `.eq("user_id", ...)` of `.eq("merchant_id", ...)` filter toe.
2. (Optioneel) Wrap de pagina met `useRequireAuth()` of `useRequireRole()` voor nette redirect.
3. Run `npm run audit:queries` lokaal — moet ✅ groen zijn.
4. Als de query bewust geen client-side filter nodig heeft (bv. admin route): verplaats naar `src/pages/admin/` of voeg expliciet toe aan `ALLOWLIST` met motivering.
