# System Zarządzania Inwentaryzacją

## Stack Technologiczny

- **Backend:** FastAPI
- **Frontend:** React + TypeScript
- **Baza danych:** PostgreSQL
- **Konteneryzacja:** Docker + Docker Compose

## Struktura Projektu

- `/backend` - logika biznesowa i API
- `/frontend` - interfejs użytkownika
- `/docs` - dokumentacja projektowa

## Uruchomienie

Wymagania: Docker, Docker Compose, Git Bash (Windows) lub terminal (macOS/Linux).

Pierwsza konfiguracja projektu. Przy pierwszym uruchomieniu kopiowane
jest `.env.example` -> `.env`. Następnie należy uzupełnić zmienne w `.env` i
uruchomić ponownie skrypt.
```bash
sh setup.sh
```
