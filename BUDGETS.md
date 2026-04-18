# Budgets & spending caps — éénmalige setup

> Dit is een **handmatige checklist** die jij éénmalig afloopt. Lovable kan caps niet voor je instellen omdat ze in externe dashboards staan.
>
> Tijdsinvestering: **~5 minuten**.
>
> Drempels (conservatief): **€10 warn / €25 alert / €50 stop**.
> Past deze later aan zodra je weet wat normaal verbruik is.

---

## ✅ Stap 1 — Lovable Cloud & AI balance

Dit dekt: Supabase database, Storage, Edge Functions én de AI Gateway (`LOVABLE_API_KEY`).

1. Open Lovable → klik linksboven je workspace-naam
2. Ga naar **Settings → Plans & Credits → Cloud & AI balance**
3. Zet:
   - [ ] **Auto-recharge: UIT** (of cap op €25/maand)
   - [ ] **Hard spending limit: €50/maand**
   - [ ] **Alert e-mail: jouw co-founder adres(sen)**
   - [ ] **Alert thresholds: 20% / 50% / 80%** (= €10 / €25 / €40)

> Je krijgt elke maand $25 gratis Cloud + $1 gratis AI. De cap geldt bovenop dat tegoed.

---

## ✅ Stap 2 — Resend (e-mail)

Dit dekt: alle e-mails verstuurd via `send-deal-notifications` en `send-contact-message`.

1. Open [resend.com/settings/billing](https://resend.com/settings/billing)
2. Zet:
   - [ ] **Plan: Free** (3000 emails/maand, $0) — verander pas naar Pro als je tegen de limiet aanloopt
   - [ ] **Billing alert bij $10 / $25 / $50** (Settings → Notifications)
   - [ ] **Sending limit per dag: 200** (Settings → Sending → tijdelijk lager tijdens MVP)

> De Free tier is je natuurlijke hard cap: bij 3001 mails stopt Resend automatisch.

---

## ✅ Stap 3 — Supabase Auth rate-limits

Dit voorkomt dat een bot 10.000 signups doet en zo Resend leegtrekt (auth-confirm mails).

1. Open Lovable → Cloud → Auth → Rate limits
2. Zet:
   - [ ] **Email signups per uur: 30** (default is 30, check of dat nog zo is)
   - [ ] **OTP verzending per uur: 30**

---

## ✅ Stap 4 — Test je alerts

- [ ] Stuur een test-mail vanuit Resend dashboard → bevestig dat je de billing-alert e-mail correct ontvangt op je inbox (geen spam)
- [ ] Doe hetzelfde voor Lovable Cloud — trigger een handmatige notificatie via support of laat een edge function bewust een paar AI calls doen

---

## 🔁 Maandelijkse review (5 min)

Kalenderitem op de 1e van elke maand:

- [ ] Lovable Cloud usage van vorige maand → trend ok?
- [ ] Resend dashboard → aantal verzonden mails → trend ok?
- [ ] Caps nog passend bij gebruikersaantal?

---

## 🚨 Bij een echte alert

Volg de runbook in [`SECURITY.md` → "Wat te doen bij een budget-alert"](SECURITY.md#wat-te-doen-bij-een-budget-alert).

Korte versie:
1. **Identificeer** in dashboard logs welke endpoint piekt
2. **Disconnect** verdachte connector in Lovable → Connectors (instant kill, geen redeploy)
3. **Check** of er een secret-leak is (`gitleaks detect --source .`)
4. **Roteer** keys indien nodig

---

## Wat we bewust NIET doen

- **Server-side rate limiting in edge functions** — Lovable Cloud heeft hier nog geen geschikte primitives voor (Redis/Upstash niet standaard beschikbaar). Ad-hoc rate limiting geeft schijnveiligheid.
- **Per-user AI quota's in DB** — niet relevant zolang we Lovable AI Gateway niet voor user-facing AI features gebruiken.
- **Aparte dev/prod Resend accounts** — overkill voor MVP. De Free tier vangt het af.

Zodra het project groeit (>1000 actieve users / >€100/mnd usage): herzie deze keuzes.
