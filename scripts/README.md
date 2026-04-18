# Security: Secrets

Dit project hanteert één strikte regel:

> **Geen enkel third-party secret komt in de frontend bundel.**

- Supabase **anon key** (`VITE_SUPABASE_PUBLISHABLE_KEY`) is publiek — beschermd door RLS — en mag in de client.
- Alle andere keys (Resend, Lovable AI, Supabase **service_role**, etc.) blijven server-side in edge functions onder `supabase/functions/` en worden gelezen via `Deno.env.get(...)`.
- De frontend praat alleen met onze edge functions via `supabase.functions.invoke(...)`.

## Veilige build (CI guard)

Voor je publiceert of deployt:

```bash
bash scripts/build-safe.sh
```

Dit doet:
1. `npm run build`
2. `node scripts/scan-bundle-secrets.mjs` — scant de hele `dist/`-map op patronen zoals `sk_live_…`, `sk-…` (OpenAI), `re_…` (Resend), AWS keys, GitHub tokens, private-key blocks en Supabase **service_role** JWT's.

Als de scanner ook maar één treffer vindt, faalt het script met exit code 1 en wordt vermeld welk bestand en welk patroon het probleem is.

> Het script is bewust strict afgesteld om false positives op de Supabase **anon JWT** te vermijden. Pas patronen aan in `scripts/scan-bundle-secrets.mjs` als je een nieuwe provider toevoegt.

## RLS + Policy audit (release gate)

Controleert twee dingen op alle public-tabellen:

1. **RLS staat aan** — voorkomt dat een per ongeluk aangemaakte tabel onbeschermd live gaat.
2. **Policy bestaat per actie** (SELECT/INSERT/UPDATE/DELETE) — tenzij die actie bewust dicht is volgens `INTENTIONAL_BLOCKS` in `scripts/audit-rls.mjs` (bv. `vouchers` heeft bewust geen UPDATE/DELETE).

Faalt met exit 1 bij elke RLS-gap of onverwachte policy-gap.

```bash
export SUPABASE_DB_URL='postgres://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres'
npm run audit:rls
```

De connection string haal je op uit Lovable → Cloud → Database → **Connection string** (Direct connection, niet pooler).

**Output bij succes**: per tabel `✅ 🔒 [SIUD]` — letters voor aanwezige policies, `·` voor bewust dichte acties, `✗` voor ongedekte gaps.
**Output bij falen**: lijst van RLS-gaps + lijst van policy-gaps + fix-suggestie.

> Voeg een nieuwe tabel toe → werk `INTENTIONAL_BLOCKS` bij als je bewust een actie dichthoudt, en documenteer het in [`docs/policies.md`](../docs/policies.md).
>
> Run lokaal voor elke deploy, of voeg toe aan een GitHub Actions workflow met `SUPABASE_DB_URL` als repo secret.
