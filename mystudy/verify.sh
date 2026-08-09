#!/usr/bin/env bash
set -euo pipefail

pnpm --dir frontend format:check
pnpm --dir frontend lint
pnpm --dir frontend typecheck
pnpm --dir frontend test
uv run --project backend ruff format --check backend
uv run --project backend ruff check backend
uv run --project backend pytest backend/tests -q

