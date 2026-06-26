#!/usr/bin/env bash
set -euo pipefail

backup_dir="${1:-}"
force="${2:-}"
project_name="${COMPOSE_PROJECT_NAME:-$(basename "$PWD")}"

if [[ -z "$backup_dir" || ! -f "$backup_dir/mysql.sql" || ! -f "$backup_dir/photos.tar.gz" ]]; then
  echo "Usage: scripts/restore-docker.sh BACKUP_DIR --force" >&2
  echo "BACKUP_DIR must contain mysql.sql and photos.tar.gz" >&2
  exit 2
fi
backup_dir="$(cd "$backup_dir" && pwd)"

if [[ "$force" != "--force" ]]; then
  echo "Refusing destructive restore without --force" >&2
  exit 2
fi

if [[ -n "${MYSQL_DATABASE:-}" && ! "$MYSQL_DATABASE" =~ ^[A-Za-z0-9_]+$ ]]; then
  echo "MYSQL_DATABASE may contain only letters, numbers, and underscores" >&2
  exit 2
fi

docker compose up -d db

for attempt in $(seq 1 30); do
  if docker compose exec -T db sh -c 'mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD"' >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "30" ]]; then
    echo "Database did not become healthy" >&2
    exit 1
  fi
  sleep 2
done

docker compose exec -T db sh -c 'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`; GRANT ALL PRIVILEGES ON \`$MYSQL_DATABASE\`.* TO '\''$MYSQL_USER'\''@'\''%'\'';"'

docker compose exec -T db sh -c 'exec mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  < "$backup_dir/mysql.sql"

docker run --rm \
  -v "${project_name}_photos_data:/data" \
  -v "$backup_dir:/backup:ro" \
  busybox sh -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf {} + && tar -xzf /backup/photos.tar.gz -C /data'

echo "Restored $backup_dir"
