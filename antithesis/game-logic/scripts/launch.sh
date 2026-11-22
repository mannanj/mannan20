#!/usr/bin/env bash
# Build, validate and launch the chicken game-logic workload on Antithesis.
# Usage: scripts/launch.sh <max-compute-hours> [extra snouty launch flags...]
set -euo pipefail
HOURS="${1:?usage: launch.sh <max-compute-hours>}"; shift
CONFIG="$(cd "$(dirname "$0")/../config" && pwd)"
PLUGIN_VERSION=0.1.0
cd "$CONFIG"
docker compose -f docker-compose.yaml build
snouty validate "$CONFIG"
snouty launch --launcher basic_test --config "$CONFIG" \
  --test-name chicken-game-logic \
  --description "chicken game logic: tiers, toss physics, orb scheduler, ice" \
  --fault-tolerance resilient \
  --fault-exclusions '^driver$' \
  --max-compute-hours "$HOURS" \
  --param attrs.workload=chicken-game-logic \
  --param attrs.sut_commit="$(git -C "$CONFIG" rev-parse --short HEAD)" \
  --param attrs.plugin_version="$PLUGIN_VERSION" \
  "$@"
