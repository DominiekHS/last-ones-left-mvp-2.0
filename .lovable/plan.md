# Admin-overzicht: e-mailverificatiestatus consumenten

## Doel
Een eenvoudig admin-overzicht waarin per consumentenaccount zichtbaar is:
- Is de bevestigingsmail verstuurd? (ja/nee + datum)
- Is het account bevestigd? (ja/nee)

## Aanpak

### 1. Backend: veilige RPC-functie
De benodigde velden (`confirmation_sent_at`, `email_confirmed_at`) zitten in `auth.users`, wat niet rechtstreeks via de client te lezen is. We voegen een `SECURITY DEFINER`-functie toe die alleen voor admins toegankelijk is, consistent met bestaande admin-functies zoals `admin_get_referral_leaderboard`.

- Functie: `public.admin_get_consumer_email_statuses()`
- Retourneert: `user_id`, `confirmation_sent_at`, `email_confirmed_at`
- Autorisatie: ingelogd + `has_role(..., 'admin')`
- Grant: `EXECUTE` aan `authenticated`

### 2. Types bijwerken
`src/integrations/supabase/types.ts` krijgt de nieuwe functie in het `Functions`-blok, zodat de frontend met typeveiligheid kan werken.

### 3. Frontend: status tonen in consumentenlijst
In `src/pages/admin/AdminDashboard.tsx`:
- Nieuwe `useQuery` die de RPC eenmaal aanroept zodra de admin-tab actief is.
- Statussen worden samengevoegd met de bestaande consumentenlijst.
- Per consumentenkaart komen twee badges:
  - **Bevestigingsmail verstuurd**: groen "Ja · <datum>" of grijs "Nee"
  - **Account bevestigd**: groen "Ja · <datum>" of rood/oranje "Nee"
- Datums worden in het Nederlands getoond (`d MMM yyyy · HH:mm`).

### 4. Verificatie
- Build/typecheck controleren.
- Admin-dashboard openen en visueel verifiëren dat de badges correct renderen.
