#!/usr/bin/env bash
# Local loop: run the workload for N seconds (default 180) and list assertions that would fail.
# DRIVER_NO_EVENTUALLY=0 DRIVER_EVENTUALLY_AFTER_S=20 scripts/local.sh 45   # check the eventually
set -euo pipefail
SECS="${1:-180}"
CONFIG="$(cd "$(dirname "$0")/../config" && pwd)"
OUT="${OUT:-$(mktemp -d /tmp/chicken-local-XXXX)}"
cd "$CONFIG"
export COMPOSE_FILE=docker-compose.yaml:../scripts/docker-compose.local.yaml
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d --build
docker compose exec -T driver /opt/antithesis/test/v1/main/first_start_workload
timeout 120 sh -c 'until docker compose exec -T driver grep -qs antithesis_setup /tmp/sdk.jsonl; do sleep 2; done'
sleep "$SECS"
docker compose cp driver:/tmp/sdk.jsonl "$OUT/sdk-driver.jsonl"
docker compose cp gamelogic:/tmp/sdk.jsonl "$OUT/sdk-gamelogic.jsonl"
docker compose logs > "$OUT/compose.log" 2>&1
docker compose ps -a
docker compose down -v
echo "== assertions that would fail (output in $OUT):"
jq -rs '[.[].antithesis_assert // empty] | group_by(.message)[]
  | select(if .[0].assert_type == "sometimes" then any(.hit and .condition) | not
           else any(.hit and (.condition | not)) or (.[0].must_hit and (any(.hit) | not)) end)
  | "\(.[0].display_type)\t\(.[0].message)"' "$OUT"/sdk*.jsonl
