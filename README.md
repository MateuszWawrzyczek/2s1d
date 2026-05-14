# System Zarządzania Inwentaryzacją

## Stack Technologiczny
* **Backend:** FastAPI
* **Frontend:** React + TypeScript
* **Baza danych:** PostgreSQL
* **Konteneryzacja:** Docker + Docker Compose

## Struktura Projektu
* `/backend` - logika biznesowa i API
* `/frontend` - interfejs użytkownika
* `/infra` - konfiguracja Docker i Nginx
* `/docs` - dokumentacja projektowa

## Uruchomienie
Wymagania: Docker, Docker Compose, Git Bash (Windows) lub terminal (macOS/Linux).
```bash
sh scripts/setup.sh
```
Szczegóły dla systemów i opis pozostałych skryptów: [`scripts/README.md`](./scripts/README.md)