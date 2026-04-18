# Incident runbook — Last Ones Left

> Bij een security-incident: **adem in, open dit doc, volg de stappen**. Niet improviseren.
>
> Doel: containment binnen 30 minuten. Forensics komt daarna.
>
> Scope: 3 scenario's. Voor key-rotatie zie ook [`SECURITY.md` §"Wat te doen als er TOCH een secret is gelekt"](../../SECURITY.md#wat-te-doen-als-er-toch-een-secret-is-gelekt) — daar staan de exacte rotatie-stappen per provider.

---

## Scenario A — DB breach (vermoed of bevestigd)

**Triggers**: onverklaarbare data-mutaties, queries die niet van ons komen in Supabase logs, gebruikers melden vreemde wijzigingen, exfiltratie-vermoeden.

### Containment (eerste 15 min)

1. **Stop schade in uitbreiding** — disable signup + claim (zo zit niemand nieuwe data te creëren tijdens onderzoek):
   - Lovable Cloud → Auth → temporarily disable email signups
   - Admin panel → zet `merchant_signup_enabled = false` (bestaande toggle)
   - **Optioneel — harde maintenance mode** (alleen bij actieve aanval): zet alle merchants tijdelijk op `blocked = true` via DB-migratie. Reversibel.
2. **Roteer service_role key onmiddellijk** — dit is de "god mode" key:
   - Lovable Cloud → Database → API keys → **Rotate service_role**
   - Edge functions herstarten automatisch met nieuwe key (geen actie nodig)
3. **Roteer anon key** als je vermoedt dat hij misbruikt is:
   - Idem, en `.env` wordt automatisch bijgewerkt door Lovable
4. **Notify intern** (WhatsApp/Signal): "incident lopend, scenario A, [korte beschrijving]"

### Forensics (volgende 1–4 uur)

5. **Snapshot huidige DB-state** (vóór restore!) — zo kun je later analyseren wat er is gebeurd zonder de "crime scene" weg te gooien:
   - Supabase Dashboard → Database → Backups → handmatige snapshot
6. **Scope bepalen** — welke tabellen geraakt?
   - Supabase Dashboard → Logs → Postgres logs → filter op verdacht IP / user-id
   - Check `admin_actions` tabel: ongebruikelijke acties vanuit admin-account?
   - Check `auth.users.last_sign_in_at`: ongebruikelijke logins?
7. **Identificeer entry point**:
   - RLS-gap? → run `npm run audit:rls`
   - SQL-injectie via edge function? → check `supabase--edge_function_logs`
   - Lekgevoelige query in frontend? → run `npm run audit:queries`
   - Service-role lek in bundle? → `bash scripts/build-safe.sh`

### Restore (alleen na containment + forensics)

8. **Restore via PITR of laatste schone snapshot** — volg [`backup.md` §4 "Incident checklist"](../backup.md#4-incident-checklist-restore-procedure) stap-voor-stap.
9. **Smoke-tests** uit `backup.md` §4 stap 6 doorlopen.
10. **Heropen signup + claim** (rollback van stap 1).

### Notify (binnen 72u verplicht bij PII-impact)

11. **Bepaal wie geraakt is** (op basis van forensics §6).
12. **Notify volgens [`threat-model.md` §4](./threat-model.md#4-wie-informeren-bij-incident)**:
    - Co-founders/dev → al gedaan in §4
    - Merchants → mailing via Resend met scope + advies
    - Consumers → e-mail + banner bij PII-leak
    - **AP (Autoriteit Persoonsgegevens)** → binnen **72 uur** bij datalek met risico voor betrokkenen, via [autoriteitpersoonsgegevens.nl/datalek-melden](https://www.autoriteitpersoonsgegevens.nl/melden/meldplicht-datalekken)

### Post-mortem (binnen 1 week)

13. Update [`threat-model.md` §3](./threat-model.md#3-top-10-risicos--impact--likelihood--mitigation) met lesson learned (verhoog likelihood, voeg mitigation toe).
14. Voeg restore-test toe aan [`backup.md` §7](../backup.md#7-restore-test-log).

---

## Scenario B — API key leak (Resend, Lovable AI, Supabase)

**Triggers**: gitleaks-treffer, ongebruikelijke billing-spike, key per ongeluk gepost in chat/screenshot, externe melding.

### Containment (eerste 5 min)

1. **Identificeer welke key**: Supabase service_role / anon, Resend, Lovable AI Gateway, of toekomstige third-party.
2. **Roteer onmiddellijk** — exacte stappen per provider staan in [`SECURITY.md` §"Wat te doen als er TOCH een secret is gelekt"](../../SECURITY.md#wat-te-doen-als-er-toch-een-secret-is-gelekt):
   - **Supabase keys** → Lovable Cloud → Database → API keys → Rotate
   - **Resend** → resend.com → API keys → revoke + nieuwe → Lovable Connectors → Resend reconnect
   - **Lovable AI** → wordt auto-beheerd, contact support voor force-rotate
3. **Disable de feature die de key gebruikt** als rotatie even duurt:
   - Resend lek → Lovable → Connectors → Resend disconnecten (edge functions falen netjes, geen mail-sends)
   - Lovable AI lek → momenteel geen user-facing AI features dus N/A

### Damage assessment (volgende 30 min)

4. **Check usage logs** voor misbruik:
   - **Resend dashboard** → Emails → onverwachte volumes? Naar welke domeinen? → exporteer als evidence
   - **Lovable Cloud** → AI Gateway usage → spike?
   - **Supabase Dashboard** → API usage → spike op ongebruikelijke endpoints?
5. **Check billing**:
   - Lovable workspace settings → Cloud & AI balance → afwijking?
   - Resend billing → mails boven verwacht?
6. **Als misbruik bevestigd** → check of de provider zelf logging biedt om te bepalen welke calls de aanvaller heeft gemaakt.

### Cleanup

7. **Verwijder gelekte key uit git history** (alleen indien gecommit):
   - Volg [`SECURITY.md` stap 3](../../SECURITY.md#wat-te-doen-als-er-toch-een-secret-is-gelekt) — `git filter-repo` of BFG.
8. **Notify team** dat ze fresh clone moeten maken na force-push.
9. **Voeg geroteerde key toe** aan Lovable Cloud → Edge functions → Secrets (NOOIT in codebase).

### Verifieer + post-mortem

10. **Run scanners** lokaal: `bash scripts/build-safe.sh` + `gitleaks detect --source .` → 0 treffers.
11. **Update [`threat-model.md`](./threat-model.md)** als de root cause een nieuwe vector blootlegt.

---

## Scenario C — Account takeover / privilege abuse

**Triggers**: gebruiker meldt vreemde acties op zijn account, admin/merchant doet onverwachte mutaties, ongebruikelijke login-locaties in `auth.users.last_sign_in_at`, brute-force pogingen in logs.

### Containment (eerste 10 min)

1. **Lock het verdachte account direct**:
   - **Consumer** → DB-migratie: `UPDATE auth.users SET banned_until = '2099-01-01' WHERE id = '<user-id>';` of via Lovable Cloud → Auth → Users → ban
   - **Merchant** → admin panel → zet status op **Geblokkeerd** met reden ("verdacht van takeover"). Soft-blokkeert ook hun deals.
   - **Admin** → idem ban via Lovable Cloud Auth + `DELETE FROM user_roles WHERE user_id = '<admin-id>' AND role = 'admin';` (kritisch — admin kan anders zichzelf weer unblokken)
2. **Force logout alle sessies van dat account**:
   - Lovable Cloud → Auth → Users → kies user → "Sign out user"
3. **Notify intern**: welk account, welke rol, wat is het vermoeden.

### Damage assessment (volgende 30 min)

4. **Check wat er met dat account is gedaan**:
   - `admin_actions` tabel → filter op `admin_id = <verdachte>` voor admin-takeover
   - `merchant_communications` + `deals` table → filter op merchant_id voor merchant-takeover
   - `vouchers` + `claim_history` → filter op user_id voor consumer-takeover
5. **Check checkout-links op deals** van geraakte merchant — phishing-redirect?
   - `SELECT id, title, checkout_link FROM deals WHERE merchant_id = '<id>' AND deleted_at IS NULL;`
6. **Check of de aanvaller andere accounts heeft aangemaakt** vanuit dezelfde sessie:
   - Supabase Dashboard → Auth → Users → sorteer op created_at, zelfde IP / user-agent

### Recovery

7. **Reverse schade**:
   - Phishing checkout-links → nullify of restore via PITR
   - Frauduleuze admin-acties → manueel terugdraaien op basis van `admin_actions` log
   - Frauduleuze claims → `UPDATE vouchers SET deleted_at = now() WHERE id = '<id>';`
8. **Reset wachtwoord** voor het echte account-eigenaar:
   - Stuur password-reset link via Lovable Cloud → Auth → Users → "Send password recovery"
9. **Heropen account** zodra eigenaar nieuw wachtwoord heeft + identiteit bevestigd is.

### Notify

10. **Account-eigenaar** → e-mail met wat er is gebeurd + advies (uniek wachtwoord, MFA wanneer beschikbaar).
11. **Indien PII van anderen geraakt** (bv. merchant heeft via takeover consumer-data benaderd) → consumers notify + AP-melding.

### Post-mortem

12. **Root cause**:
    - Zwak/hergebruikt wachtwoord? → leaked-password protection check
    - Phishing? → user-education noodzakelijk
    - RLS-gap waardoor merchant data van anderen kon zien? → audit:rls + nieuwe policy
13. **Backlog opvoeren**: MFA voor admin (was al backlog-item, nu prioriteit verhogen).

---

## Verwante docs

- Threat model: [`threat-model.md`](./threat-model.md)
- Release-gate: [`release-checklist.md`](./release-checklist.md)
- Key-rotatie details per provider: [`SECURITY.md`](../../SECURITY.md#wat-te-doen-als-er-toch-een-secret-is-gelekt)
- Backup/restore mechanics: [`backup.md`](../backup.md)
