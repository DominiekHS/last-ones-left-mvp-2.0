#!/usr/bin/env bash
# Veilige build-gate: draait de verplichte security-tests, bouwt de frontend en
# scant daarna de bundle op uitgelekte secrets. Faalt zodra één stap rood is.
#
# Gebruik:
#   bash scripts/build-safe.sh
#
# (Equivalent aan een 'npm run build:safe' script — package.json wordt
# in dit project automatisch beheerd en kan niet handmatig aangepast worden.)
set -euo pipefail

echo "▶ Stap 1/3 — Verplichte security-tests (error-mapping mag niet lekken)…"
npx vitest run src/lib/friendly-errors.test.ts

echo ""
echo "▶ Stap 2/3 — Frontend bouwen…"
npm run build

echo ""
echo "▶ Stap 3/3 — Bundle scannen op secrets…"
node scripts/scan-bundle-secrets.mjs
