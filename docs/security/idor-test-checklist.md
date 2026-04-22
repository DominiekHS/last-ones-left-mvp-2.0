# Manual IDOR / Cross-User Isolation Test Checklist

CodeWatchtower (en elke serieuze security-audit) raadt aan om naast statische
RLS-checks ook handmatig te verifiëren dat een ingelogde user **niemand
anders' data** kan zien of muteren — vooral bij RPC-functies, joins en views.

Draai deze checklist **vóór elke release** met twee testaccounts per rol.

## Setup

Maak twee testaccounts per rol aan (zie [`mem://auth/credentials`](../../.lovable/memory/auth/credentials.md)):

- **Consumer A** + **Consumer B** (verschillende user_ids)
- **Merchant A** + **Merchant B** (verschillende merchant_ids)
- **Admin** (read-all bevoegdheid)

Open twee browsersessies (bv. normaal venster + incognito) zodat A en B
tegelijk ingelogd zijn.

## Test 1 — Vouchers / kortingscodes

| # | Stap | Verwacht |
|---|---|---|
| 1 | Consumer A claimt deal X. | Voucher verschijnt op `/kortingscodes`. |
| 2 | Kopieer voucher-id uit URL of devtools. | — |
| 3 | Login als Consumer B. Open `/kortingscodes/<voucher-id-van-A>`. | 404 of "niet gevonden". **Nooit** A's code zichtbaar. |
| 4 | In devtools-console van Consumer B: `await supabase.from('vouchers').select('*').eq('id','<id-van-A>')` | Empty array (RLS filtert). |

## Test 2 — Claim history

| # | Stap | Verwacht |
|---|---|---|
| 1 | Login als Consumer B, open `/geschiedenis`. | Alleen B's claims. |
| 2 | Devtools: `await supabase.from('claim_history').select('user_id').limit(50)` | **Alle** rijen tonen B's user_id. Geen enkele rij van A. |

## Test 3 — Merchant deals & analytics

| # | Stap | Verwacht |
|---|---|---|
| 1 | Login als Merchant A, noteer merchant_id en een deal-id. | — |
| 2 | Login als Merchant B, open `/merchant/deals/<id-van-A>` direct in URL. | "Niet gevonden" of redirect. |
| 3 | Devtools van B: `await supabase.from('deals').select('*').eq('merchant_id','<A>')` | RLS staat alléén `is_merchant_active`-pad toe (publieke view). Geen `expiry_time` in het verleden. |
| 4 | Devtools van B: `await supabase.from('deal_sales_daily').select('*')` | Alleen B's eigen deals zichtbaar. |
| 5 | Devtools van B: `await supabase.from('deal_events').select('*')` | Alleen events op B's eigen deals (via `is_deal_owner`). |

## Test 4 — Profiles & user_roles

| # | Stap | Verwacht |
|---|---|---|
| 1 | Devtools van Consumer B: `await supabase.from('profiles').select('*')` | **Exact 1 rij** (B zelf). |
| 2 | Devtools van Consumer B: `await supabase.from('user_roles').select('*')` | Alleen B's eigen rol-rij. |
| 3 | Probeer als consumer een merchant-rol toe te kennen: `await supabase.from('user_roles').insert({user_id:'<B>',role:'admin'})` | RLS-fout (`Users can self-assign consumer role` staat alleen `consumer` toe). |

## Test 5 — RPC `claim_deal`

| # | Stap | Verwacht |
|---|---|---|
| 1 | Consumer B probeert namens Consumer A te claimen: `await supabase.rpc('claim_deal',{p_user_id:'<A>',p_deal_id:'<X>'})` | Fout: "Cannot claim on behalf of another user". |
| 2 | Niet-ingelogde gebruiker roept RPC aan. | Fout: "Not authenticated". |
| 3 | Consumer A claimt dezelfde deal twee keer. | Tweede call: "Deal already claimed". |
| 4 | Merchant-account roept RPC aan op eigen deal. | Fout: "Only consumers can claim deals". |

## Test 6 — Admin endpoints

| # | Stap | Verwacht |
|---|---|---|
| 1 | Login als consumer, open `/admin`. | Redirect naar 404 / login. |
| 2 | Devtools: `await supabase.functions.invoke('admin-env-status')` als consumer. | 403. |
| 3 | Devtools: `await supabase.from('admin_actions').select('*')` als consumer. | Empty array. |
| 4 | Devtools: `await supabase.from('audit_log').select('*')` als consumer. | Empty array. |
| 5 | Devtools: `await supabase.from('merchant_communications').select('*')` als merchant. | Empty array. |

## Test 7 — Storage buckets

| # | Stap | Verwacht |
|---|---|---|
| 1 | Probeer als Consumer A een file te uploaden naar pad `<merchant-B-id>/logo.png` in `merchant-logos`. | RLS-fout (folder-naam moet matchen met user_id van bucket-eigenaar). |
| 2 | Probeer als Merchant A een deal-image te uploaden naar Merchant B's folder. | RLS-fout. |
| 3 | Verwijder logo van een andere merchant. | RLS-fout. |

## Test 8 — Soft-deletes blijven verborgen

| # | Stap | Verwacht |
|---|---|---|
| 1 | Admin zet `merchants.deleted_at` op `now()` voor merchant A. | — |
| 2 | Anonymous bezoeker opent `/winkel/<A>`. | "Bedrijf niet gevonden". |
| 3 | Devtools van anonymous: `await supabase.from('merchants_public').select('*').eq('id','<A>')` | Empty array. |
| 4 | Consumer die voucher van A heeft, opent `/kortingscodes`. | Voucher zichtbaar (claim_history snapshot blijft, geen merchant-link nodig). |

## Acceptance

Alle 8 tests moeten ✅ tonen voordat een release naar productie mag.
Bij een ❌: noteer de breach in `docs/security/incident-runbook.md`,
voeg een regression-test toe en patch RLS / RPC voordat je deployt.

> Tip: automatiseer Test 1, 2 en 4 met een Playwright e2e suite zodra het loont.
