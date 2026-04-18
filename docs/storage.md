# Storage — bucket-matrix & policies

Status: bijgewerkt 2026-04-18 na security hardening #9 (write-policies strakker + client-side validatie + UUID filenames).

> **Regel:** alle write-acties op storage vereisen `role=authenticated` + `merchant`-rol + pad-prefix `{auth.uid()}/...`. Anon kan nooit uploaden, consumers/admins ook niet (met de huidige flows). Lezen blijft openbaar voor de twee bestaande buckets — bewuste keuze omdat de assets in `<img>` tags getoond worden, ook voor uitgelogde bezoekers.

## Bucket-matrix

| Bucket | Public read | Doel | Pad-conventie |
|---|---|---|---|
| `deal-images` | ✅ | Hoofdfoto van een deal + stappenplan-afbeeldingen | `{auth.uid()}/<uuid>.{jpg\|png\|webp}` of `{auth.uid()}/payment-steps/<uuid>.{ext}` |
| `merchant-logos` | ✅ | Logo van het bedrijfsprofiel | `{auth.uid()}/logo.{jpg\|png\|webp}` (upsert) |

> Beide buckets staan op `public = true` zodat anon `<img src="https://...storage/v1/object/public/...">` direct werkt zonder signed URL. Listing van bucket-inhoud is daardoor mogelijk maar acceptabel: bestandsnamen zijn UUIDs en bevatten geen PII.

## Policies (write — `storage.objects`)

Identiek per bucket, alleen `bucket_id` verschilt:

| Actie | Role | Conditie |
|---|---|---|
| INSERT | `authenticated` | `has_role(auth.uid(), 'merchant')` AND `(auth.uid())::text = (storage.foldername(name))[1]` |
| UPDATE | `authenticated` | idem (USING + WITH CHECK) |
| DELETE | `authenticated` | idem (USING) |
| SELECT | `public` (anon + authenticated) | `bucket_id = '<bucket>'` |

**Effect**:
- Een **anon** bezoeker krijgt 401 bij upload-pogingen — komt niet eens langs role-filter.
- Een **consumer** krijgt 403 — heeft geen `merchant`-rol.
- **Merchant A** kan niet uploaden naar `merchants_b_uuid/...` — folder-prefix-check faalt.
- **Merchant A** kan niets verwijderen of overschrijven dat in een andere folder staat.
- Een **admin** kan via de UI niets uploaden (geen merchant-rol). Indien ooit nodig: aparte admin-policy of via service-role edge function.

## Client-side validatie

Alle uploads gaan via `src/lib/storage-uploads.ts` → `uploadImage()`. Die helper:

1. Controleert `file.size <= 5 MB` → anders error.
2. Controleert `file.type ∈ {image/jpeg, image/png, image/webp}` → anders error.
3. Mapt mime-type naar extensie (`.jpg` / `.png` / `.webp`) — **niet** de bestandsnaam, om extension-spoofing te voorkomen.
4. Genereert een fresh `crypto.randomUUID()` als bestandsnaam (behalve `merchant-logos` waar `logo` met `upsert: true` wordt gebruikt).
5. Bouwt het pad `{userId}/[subfolder/]<naam>.<ext>` — geen user-input in het pad → geen path-traversal mogelijk.
6. Geeft de publieke URL terug.

Gebruikt in:
- `src/pages/merchant/MerchantProfile.tsx` — logo upload
- `src/pages/merchant/DealForm.tsx` — deal afbeelding
- `src/pages/merchant/AdForm.tsx` — deal afbeelding
- `src/components/merchant/PaymentStepsEditor.tsx` — stappenplan-afbeelding (subfolder `payment-steps`)

## Handmatig testplan per rol

> Snel uit te voeren via DevTools → Network → upload-flow.

### anon (uitgelogd)
| Actie | Verwacht |
|---|---|
| `<img src=".../deal-images/<uuid>/<file>.jpg">` laden | ✅ 200 |
| `<img src=".../merchant-logos/<uuid>/logo.png">` laden | ✅ 200 |
| Upload via SDK naar `deal-images` | ❌ 401 (no auth) |
| Upload via SDK naar `merchant-logos` | ❌ 401 |

### consumer (ingelogd, role=consumer)
| Actie | Verwacht |
|---|---|
| Lezen public URL | ✅ 200 |
| Upload naar `deal-images/{me}/x.jpg` | ❌ 403 (mist `merchant`-rol) |
| Upload naar `merchant-logos/{me}/logo.png` | ❌ 403 |

### merchant A (role=merchant, eigen `auth.uid()` = A)
| Actie | Verwacht |
|---|---|
| Upload `deal-images/A/abc.jpg` (≤5MB, jpg) | ✅ 200 |
| Upload `deal-images/A/abc.exe` (mime=application/x-msdownload) | ❌ client-side blocked: "Alleen JPG/PNG/WEBP" |
| Upload 6 MB jpg | ❌ client-side blocked: "Bestand te groot" |
| Upload `deal-images/B/abc.jpg` via custom path | ❌ 403 (folder-prefix mismatch) |
| Logo upsert `merchant-logos/A/logo.png` | ✅ 200 (overschrijft vorige) |
| Delete `deal-images/B/<file>` | ❌ 403 |

### admin (role=admin)
| Actie | Verwacht |
|---|---|
| Lezen public URL | ✅ 200 |
| Upload naar willekeurige bucket via UI | ❌ 403 (geen merchant-rol) — bewust |

## Wijzigingsproces

Nieuwe upload-flow toevoegen:
1. Gebruik **altijd** `uploadImage()` uit `src/lib/storage-uploads.ts`.
2. Geef `bucket`, `userId` (= `auth.uid()`), `file` mee. Optioneel `subfolder` voor logische groepering.
3. Voor overschrijven (zoals logo): `fixedName: "..."` + `upsert: true`.
4. Lees nooit `file.name` om de extensie te bepalen — de helper doet dat veilig op basis van mime.
5. Update deze matrix als je een nieuwe bucket of subfolder introduceert.

## Bekende open punten

| Item | Status | Reden |
|---|---|---|
| Linter warning `Public Bucket Allows Listing` (×2) | Geaccepteerd | Bestandsnamen zijn UUIDs zonder informatie. Schrijf-policies dichtgetimmerd. |
| Geen rate-limiting op uploads | Open (laag risico) | Beperkte aanvalsoppervlakte: alleen merchants kunnen uploaden, elk bestand max 5MB. Overweeg edge-function-proxy als merchant-base groeit. |
| Verweesde bestanden bij deal-delete | Open | Geen cleanup-cron voor storage. Niet kritisch (publieke read, geen kosten-issue op huidige schaal). |
