#!/usr/bin/env bash
set -euo pipefail

backup_root="${1:-backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${backup_root%/}/${timestamp}"
project_name="${COMPOSE_PROJECT_NAME:-$(basename "$PWD")}"

mkdir -p "$backup_dir"
backup_dir="$(cd "$backup_dir" && pwd)"

docker compose exec -T db sh -c 'exec mysqldump --no-tablespaces -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > "$backup_dir/mysql.sql"

docker run --rm \
  -v "${project_name}_photos_data:/data:ro" \
  -v "$backup_dir:/backup" \
  busybox tar -czf /backup/photos.tar.gz -C /data .

cat > "$backup_dir/README.txt" <<EOF
Backup created at ${timestamp}

Files:
- mysql.sql: MySQL logical dump
- photos.tar.gz: item photo volume archive

Restore:
  scripts/restore-docker.sh "$backup_dir" --force
EOF

echo "$backup_dir"
