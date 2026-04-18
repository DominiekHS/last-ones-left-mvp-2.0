#!/usr/bin/env bash
# Veilige build: bouwt de frontend en scant daarna de bundle op uitgelekte secrets.
# Faalt als er ook maar één verdachte string in dist/ staat.
#
# Gebruik:
#   bash scripts/build-safe.sh
#
# (Equivalent aan een 'npm run build:safe' script — package.json wordt
# in dit project automatisch beheerd en kan niet handmatig aangepast worden.)
set -euo pipefail

echo "▶ Stap 1/2 — Frontend bouwen…"
npm run build

echo ""
echo "▶ Stap 2/2 — Bundle scannen op secrets…"
node scripts/scan-bundle-secrets.mjs
