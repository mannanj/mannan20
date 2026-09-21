#!/usr/bin/env bash

set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
blocked_path=0

while IFS= read -r -d '' staged_path; do
  lower_path=$(printf '%s' "$staged_path" | tr '[:upper:]' '[:lower:]')
  base_name=${lower_path##*/}

  case "$base_name" in
    .env.example|.dev.vars.example|*.example)
      continue
      ;;
  esac

  case "$base_name" in
    .env|.env.*|.dev.vars|.envrc|.npmrc|.pypirc|.netrc|credentials.json|\
    *credentials*.json|*service-account*.json|*service_account*.json|\
    id_rsa|id_rsa.*|id_ed25519|id_ed25519.*|*.pem|*.key|*.p12|*.pfx|\
    *.jks|*.keystore|*.kdbx|*.mobileprovision|*.tfstate|*.tfstate.*|\
    *.tfvars|*.auto.tfvars)
      echo "Blocked sensitive staged path: $staged_path" >&2
      blocked_path=1
      ;;
  esac
done < <(git diff --cached --name-only --diff-filter=ACMR -z)

if [ "$blocked_path" -ne 0 ]; then
  echo "Move real credentials to an ignored local file or secret store." >&2
  exit 1
fi

gitleaks_bin=$("$repo_root/scripts/security/bootstrap-gitleaks.sh")

"$gitleaks_bin" git \
  --staged \
  --redact=100 \
  --no-banner \
  --config "$repo_root/.gitleaks.toml" \
  "$repo_root"
