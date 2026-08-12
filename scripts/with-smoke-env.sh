#!/usr/bin/env bash
set -euo pipefail

set -a
source .env
set +a

append_schema() {
  local url="$1"
  local schema="${SMOKE_SCHEMA:-codex_smoke}"

  if [[ "$url" == *"schema="* ]]; then
    printf "%s" "$url"
  elif [[ "$url" == *"?"* ]]; then
    printf "%s&schema=%s" "$url" "$schema"
  else
    printf "%s?schema=%s" "$url" "$schema"
  fi
}

base_direct_url="${DIRECT_URL:-$DATABASE_URL}"

export DIRECT_URL
DIRECT_URL="$(append_schema "$base_direct_url")"

export DATABASE_URL
DATABASE_URL="$DIRECT_URL"

exec "$@"
