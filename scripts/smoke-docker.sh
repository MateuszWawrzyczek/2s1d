#!/usr/bin/env bash
set -euo pipefail

project="${COMPOSE_PROJECT_NAME:-pz-smoke}"
app_port="${APP_PORT:-18787}"

export COMPOSE_PROJECT_NAME="$project"
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-ci-root-password}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-ci-user-password}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-pz_db}"
export MYSQL_USER="${MYSQL_USER:-pz_user}"
export JWT_SECRET="${JWT_SECRET:-ci-jwt-secret-value-at-least-32-chars}"
export DEV_BYPASS_AUTH="${DEV_BYPASS_AUTH:-false}"
export GOOGLE_CLIENT_ID="${SMOKE_GOOGLE_CLIENT_ID:-}"
export INITIAL_ADMIN_EMAIL="${INITIAL_ADMIN_EMAIL:-admin@agh.edu.pl}"
export INITIAL_ADMIN_PASSWORD="${INITIAL_ADMIN_PASSWORD:-ci-initial-admin-password}"
export APP_PORT="$app_port"
export NOTIFICATIONS_INTERVAL_MINUTES="${NOTIFICATIONS_INTERVAL_MINUTES:-60}"

cleanup() {
  docker compose --project-name "$project" --profile tools down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

cleanup
docker compose --project-name "$project" --profile tools build migrate app
docker compose --project-name "$project" up --build -d db
docker compose --project-name "$project" --profile tools run --rm migrate
docker compose --project-name "$project" up --build -d app

for attempt in $(seq 1 30); do
  if curl --fail --silent "http://127.0.0.1:${app_port}/api/health" >/dev/null; then
    SMOKE_BASE_URL="http://127.0.0.1:${app_port}" \
      SMOKE_EXPECT_DEV_BYPASS=false \
      SMOKE_ADMIN_EMAIL="$INITIAL_ADMIN_EMAIL" \
      SMOKE_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
      node scripts/smoke-api.mjs
    docker compose --project-name "$project" exec -T app pnpm run notifications:run
    exit 0
  fi
  sleep 2
done

docker compose --project-name "$project" logs app
exit 1
