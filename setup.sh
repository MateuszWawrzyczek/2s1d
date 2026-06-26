#!/bin/sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Skopiowano .env.example -> .env"
fi

echo "Uruchamianie bazy danych (pierwsze uruchomienie: import referencyjnego SQL + migracji)..."
docker compose up db -d

echo "Czekam na gotowość MySQL (import referencyjnej bazy 6.7MB moze potrwac)..."
# Wait for MySQL to accept connections AND finish initdb
for i in $(seq 1 60); do
  if docker compose exec db mysqladmin ping -h localhost --silent 2>/dev/null; then
    # Check if initdb is complete — reference table should exist
    if docker compose exec db mysql -u root -proot -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='pz_db' AND table_name='inv_urzadzenia'" 2>/dev/null | grep -q '[0-9]'; then
      echo "✓ MySQL gotowy, dane referencyjne zaimportowane."
      break
    fi
  fi
  sleep 3
done

echo "Aplikowanie migracji Drizzle..."
pnpm run db:migrate

echo "Importowanie danych referencyjnych do tabel aplikacji..."
MYSQL_HOST=localhost MYSQL_PORT=3306 \
  MYSQL_USER=pz_user MYSQL_PASSWORD=pz_pass MYSQL_DATABASE=pz_db \
  npx tsx src/db/import-koidc.ts

echo ""
echo "=== Uruchamianie aplikacji ==="
pnpm dev
