#!/bin/sh
# pierwsza konfiguracja projektu
set -e
 
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Skopiowano .env.example -> .env"
  echo "Uzupelnij zmienne w .env i uruchom skrypt ponownie."
  exit 0
fi
 
docker compose up --build -d
echo "Frontend: http://localhost:5173 | Backend: http://localhost:8000"