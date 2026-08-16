#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-/opt/migu-partyfinder}"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Repository not found at: $REPO_DIR" >&2
  exit 1
fi

cd "$REPO_DIR"

if [[ ! -f ".env" ]]; then
  echo "Production .env not found at $REPO_DIR/.env" >&2
  exit 1
fi

echo "Updating repository..."
git pull --ff-only

echo "Validating Docker Compose configuration..."
docker compose config >/dev/null

echo "Building and starting Partyfinder..."
docker compose up -d --build

echo "Waiting for application health..."
healthy=0

for _ in $(seq 1 30); do
  if curl --fail --silent --max-time 2 \
      http://127.0.0.1:3000/api/health \
      | grep -q '"status":"ok"'; then
    healthy=1
    break
  fi

  sleep 2
done

if [[ "$healthy" -ne 1 ]]; then
  echo "Partyfinder did not become healthy." >&2
  docker compose ps
  exit 1
fi

echo
docker compose ps
echo
echo "Partyfinder deployment completed successfully."
