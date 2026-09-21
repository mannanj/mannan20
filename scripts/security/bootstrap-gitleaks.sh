#!/usr/bin/env bash

set -euo pipefail

gitleaks_version="8.30.1"

if [ -n "${GITLEAKS_BIN:-}" ]; then
  if [ ! -x "$GITLEAKS_BIN" ]; then
    echo "GITLEAKS_BIN is not executable: $GITLEAKS_BIN" >&2
    exit 1
  fi
  if [ "$("$GITLEAKS_BIN" version)" != "$gitleaks_version" ]; then
    echo "GITLEAKS_BIN must be Gitleaks $gitleaks_version." >&2
    exit 1
  fi
  printf '%s\n' "$GITLEAKS_BIN"
  exit 0
fi

if command -v gitleaks >/dev/null 2>&1; then
  system_gitleaks=$(command -v gitleaks)
  if [ "$("$system_gitleaks" version)" = "$gitleaks_version" ]; then
    printf '%s\n' "$system_gitleaks"
    exit 0
  fi
fi

git_common_dir=$(git rev-parse --git-common-dir)
case "$git_common_dir" in
  /*) ;;
  *) git_common_dir="$(git rev-parse --show-toplevel)/$git_common_dir" ;;
esac

tool_dir="$git_common_dir/security-tools/gitleaks-$gitleaks_version"
tool_path="$tool_dir/gitleaks"
if [ -x "$tool_path" ]; then
  printf '%s\n' "$tool_path"
  exit 0
fi

os_name=$(uname -s)
arch_name=$(uname -m)
case "$os_name:$arch_name" in
  Darwin:arm64)
    asset_platform="darwin_arm64"
    asset_sha256="b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5"
    ;;
  Darwin:x86_64)
    asset_platform="darwin_x64"
    asset_sha256="dfe101a4db2255fc85120ac7f3d25e4342c3c20cf749f2c20a18081af1952709"
    ;;
  Linux:aarch64|Linux:arm64)
    asset_platform="linux_arm64"
    asset_sha256="e4a487ee7ccd7d3a7f7ec08657610aa3606637dab924210b3aee62570fb4b080"
    ;;
  Linux:x86_64|Linux:amd64)
    asset_platform="linux_x64"
    asset_sha256="551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb"
    ;;
  *)
    echo "Unsupported platform for pinned Gitleaks: $os_name $arch_name" >&2
    echo "Install Gitleaks $gitleaks_version and set GITLEAKS_BIN." >&2
    exit 1
    ;;
esac

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to bootstrap Gitleaks $gitleaks_version." >&2
  exit 1
fi

temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/mannan20-gitleaks.XXXXXX")
trap 'rm -rf "$temp_dir"' EXIT

asset_name="gitleaks_${gitleaks_version}_${asset_platform}.tar.gz"
asset_path="$temp_dir/$asset_name"
asset_url="https://github.com/gitleaks/gitleaks/releases/download/v${gitleaks_version}/${asset_name}"

echo "Downloading pinned Gitleaks $gitleaks_version..." >&2
curl --fail --silent --show-error --location "$asset_url" --output "$asset_path"

if command -v shasum >/dev/null 2>&1; then
  printf '%s  %s\n' "$asset_sha256" "$asset_path" | shasum -a 256 -c - >/dev/null
elif command -v sha256sum >/dev/null 2>&1; then
  printf '%s  %s\n' "$asset_sha256" "$asset_path" | sha256sum -c - >/dev/null
else
  echo "A SHA-256 verification tool is required." >&2
  exit 1
fi

tar -xzf "$asset_path" -C "$temp_dir" gitleaks
mkdir -p "$tool_dir"
install -m 0755 "$temp_dir/gitleaks" "$tool_path"
printf '%s\n' "$tool_path"
