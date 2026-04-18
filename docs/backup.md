# Backup & Restore Runbook — Last Ones Left

> Doel: bij data-incident (foutieve migratie, accidentele DELETE, hack, corruptie) snel en met minimaal dataverlies herstellen.

## 1. Backup-strategie (Supabase Postgres)

| Onderdeel | Configuratie | Waar te checken |
|---|---|---|
| Daily automated backups | Standaard aan op alle Supabase plannen | Project → Database → Backups |
| Point-in-Time Recovery (PITR) | Vereist Pro plan of hoger | Project → Database → Backups → "Enable PITR" |
| Retentie | MVP: 7 dagen (Free), Pro: configureer 14–30 dagen | Project Settings → Database |
| Storage backups (deal-images, merchant-logos) | **Niet automatisch.** Zie sectie 6. | Storage → Buckets |

**Actie nu**: log in op Supabase → controleer dat dagelijkse backups zichtbaar zijn in de lijst, en upgrade naar Pro voor PITR zodra je betalende klanten hebt.

## 2. RPO / RTO doelen

| Metric | MVP-doel | Toelichting |
|---|---|---|
| **RPO** (max dataverlies) | 24 uur (Free) / < 5 min (PITR Pro) | Hoeveel data mag verloren gaan |
| **RTO** (max downtime) | 4 uur | Hoe snel weer live na incident |

## 3. Rollen & verantwoordelijkheid

- **Restore mag uitgevoerd worden door**: project-eigenaar / co-founder met Supabase-toegang.
- **Communicatie naar gebruikers**: via support-mail / status-update op website.
- **Migraties in productie**: alleen na review en backup-check (zie sectie 5).

## 4. Incident checklist (restore procedure)

Volg deze stappen bij een data-incident:

1. **Stop writes** — zet de app in maintenance-mode of disable kritieke endpoints/edge-functions.
2. **Documenteer huidige state** — maak een handmatige snapshot van de huidige (corrupte) DB voordat je restoret, zodat je later forensics kunt doen.
3. **Identificeer restore-punt**:
   - Bij PITR: kies exact tijdstip vóór het incident.
   - Bij dagelijkse snapshot: kies meest recente snapshot vóór het incident.
4. **Test eerst op staging** (indien beschikbaar) — restore naar een aparte branch/project.
5. **Voer restore uit** via Supabase dashboard → Database → Backups → Restore.
6. **Validatie smoke-tests** (run minimaal):
   - [ ] Login werkt (admin, merchant, consumer testaccounts)
   - [ ] Homepage toont actieve deals
   - [ ] Merchant kan eigen deals zien
   - [ ] Consumer kan eigen kortingscodes zien
   - [ ] `claim_deal()` RPC werkt (claim test-deal)
7. **Herstel writes** — disable maintenance-mode.
8. **Communiceer intern + extern** wat er hersteld is en welke data eventueel verloren ging.

## 5. Migratie-discipline (preventie)

Zie [`docs/migrations.md`](./migrations.md) voor de volledige checklist. Kort:

- ✅ Altijd eerst in staging testen
- ✅ Backup-status checken vóór productie-migratie
- ✅ Rollback-SQL klaar hebben
- ✅ Soft-delete gebruiken i.p.v. hard DELETE waar mogelijk

## 6. Storage backups

Storage buckets (`deal-images`, `merchant-logos`) worden **niet** meegenomen in Postgres backups.

**MVP-aanpak**: accepteer risico. Images zijn niet kritiek — een ondernemer kan opnieuw uploaden.

**Productie-aanpak (later)**:
- Periodieke export via `supabase storage download` + S3/R2 mirror
- Of: enable Supabase Storage replication (indien beschikbaar op plan)

## 7. Restore-test log

Documenteer hier elke uitgevoerde restore-test:

| Datum | Uitgevoerd door | Scenario | Resultaat | Notities |
|---|---|---|---|---|
| _nog niet getest_ | — | — | — | Voer eerste test uit op staging-omgeving |

> **Actie**: plan minimaal 1× per kwartaal een restore-drill op staging.

## 8. Soft-delete: extra vangnet

Kritieke tabellen gebruiken `deleted_at` i.p.v. hard DELETE:

| Tabel | Soft-delete kolom | Hard-delete toegestaan? |
|---|---|---|
| `deals` | `deleted_at` | Alleen door admin via DB |
| `merchants` | `deleted_at` | Alleen door admin via DB |
| `vouchers` | `deleted_at` (bestond al) | Nee |
| `claim_history` | n.v.t. — immutable | Nee |

RLS-policies filteren automatisch op `deleted_at IS NULL` voor non-admins. Een per ongeluk "verwijderde" deal kan dus binnen seconden hersteld worden door een admin via:

```sql
UPDATE public.deals SET deleted_at = NULL WHERE id = '<deal-id>';
```

## 9. Destructieve admin-acties — UX-bescherming

Alle admin delete-knoppen gebruiken `<DangerConfirmDialog>` met verplichte bevestigingstekst (`VERWIJDER`). Dit voorkomt accidentele clicks. Bulk-deletes zijn niet beschikbaar in de UI.
