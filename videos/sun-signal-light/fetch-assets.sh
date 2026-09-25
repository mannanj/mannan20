#!/usr/bin/env bash
# Pull the AI-generated cut-outs from R2 into ./assets/ (kept out of git: ~20MB).
set -euo pipefail
BASE="https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/sun-signal/assets"
cd "$(dirname "$0")"; mkdir -p assets
for n in sun moon cave farmer village hills wake work rest sleep bulb streetlamp phone fluorescent tired; do
  curl -fsS -o "assets/$n.png" "$BASE/$n.png"
  echo "  assets/$n.png"
done
echo "done"
