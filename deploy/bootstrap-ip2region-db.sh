#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${IP2REGION_V4_DB:-}" || -z "${IP2REGION_V6_DB:-}" ]]; then
  echo "IP2REGION_V4_DB and IP2REGION_V6_DB are required" >&2
  exit 1
fi

if [[ -z "${IP2REGION_V4_DOWNLOAD_URL:-}" || -z "${IP2REGION_V6_DOWNLOAD_URL:-}" ]]; then
  echo "IP2REGION_V4_DOWNLOAD_URL and IP2REGION_V6_DOWNLOAD_URL are required" >&2
  exit 1
fi

mkdir -p "$(dirname "$IP2REGION_V4_DB")" "$(dirname "$IP2REGION_V6_DB")"

if [[ ! -f "$IP2REGION_V4_DB" ]]; then
  curl -fsSL "$IP2REGION_V4_DOWNLOAD_URL" -o "$IP2REGION_V4_DB"
fi

if [[ ! -f "$IP2REGION_V6_DB" ]]; then
  curl -fsSL "$IP2REGION_V6_DOWNLOAD_URL" -o "$IP2REGION_V6_DB"
fi
