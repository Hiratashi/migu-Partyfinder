#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: ./scripts/verify-production.sh partyfinder.example.com" >&2
  exit 1
fi

echo "Checking local app health..."
curl --fail --silent http://127.0.0.1:3000/api/health
echo
echo

echo "Checking public HTTPS..."
curl --fail --silent --show-error \
  --head "https://${DOMAIN}/" \
  | sed -n '1,20p'

echo
echo "Checking that public /api/health is hidden..."

status="$(
  curl --silent --output /dev/null \
    --write-out '%{http_code}' \
    "https://${DOMAIN}/api/health"
)"

if [[ "$status" != "404" ]]; then
  echo "Expected public /api/health to return 404, got $status" >&2
  exit 1
fi

echo "Public health endpoint: hidden (404)"
echo
echo "Basic production verification passed."
