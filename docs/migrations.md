# Migratie-checklist

Gebruik deze checklist vóór ELKE database-migratie naar productie.

## Vóór de migratie

- [ ] Migratie geschreven en gereviewd (peer-review of zelf-review na pauze)
- [ ] Migratie eerst lokaal/staging uitgevoerd en geverifieerd
- [ ] Rollback-SQL geschreven en getest (hoe draai je dit terug?)
- [ ] Backup-status gecheckt: laatste daily backup < 24u oud
- [ ] Bij grote/risicovolle wijziging: handmatige snapshot getriggerd in Supabase
- [ ] Geen `DROP TABLE` zonder eerst data te verifiëren als "echt weg mag"
- [ ] Geen `ALTER COLUMN` met datatypewijziging zonder backup van betrokken kolom

## Tijdens de migratie

- [ ] Migration tool gebruikt (versioned, niet handmatig in dashboard SQL editor)
- [ ] Verwacht resultaat genoteerd vóór run
- [ ] Migration uitgevoerd
- [ ] Linter-warnings gelezen en geëvalueerd
- [ ] Resultaat vergeleken met verwachting

## Na de migratie

- [ ] Smoke-test in app: belangrijkste flows werken (login, homepage, claim, merchant dashboard)
- [ ] Frontend code aangepast indien types/kolommen wijzigden
- [ ] `src/integrations/supabase/types.ts` automatisch bijgewerkt (Lovable doet dit)
- [ ] RLS-policies handmatig getest met anon/consumer/merchant/admin

## Soft-delete principe

**Voorkeur boven `DROP COLUMN` / `DELETE FROM`**:
- Markeer rijen met `deleted_at = now()` i.p.v. fysiek verwijderen
- Hernoem of deprecateer kolommen i.p.v. drop in dezelfde migratie
- Splits destructieve migraties: eerst code-deploy die kolom niet meer gebruikt, daarna pas drop

## Rollback-template

Voor elke migratie schrijf je de inverse SQL erbij:

```sql
-- Forward
ALTER TABLE x ADD COLUMN y text;

-- Rollback
ALTER TABLE x DROP COLUMN y;
```

Bij incident → run rollback SQL via Supabase dashboard.

## Verboden in productie zonder extra check

- `TRUNCATE`
- `DROP TABLE`
- `DELETE FROM x` zonder `WHERE`
- `UPDATE x SET ... ` zonder `WHERE`
- `ALTER TABLE ... DROP COLUMN` op een kolom die nog gebruikt wordt door frontend
