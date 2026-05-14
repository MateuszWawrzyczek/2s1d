Serwer API oparty na frameworku FastAPI.

## Instalacja lokalna

1. Zainstaluj uv:
```bash
pip install uv
```

3. Zainstaluj zaleznosci:
```bash
cd backend
uv sync
```

4. Ustaw zmienne środowiskowe ( uzupełnij .env )
```bash
cp ../.env.example ../.env
```
## Uruchamianie

Uruchom serwer:
```bash
uv run uvicorn app.main:app --reload
```

Po uruchomieniu serwera:
http://127.0.0.1:8000

## Struktura projektu

- app/api/v1/endpoints/ - pliki z definicjami scieżek API
- app/core/ - ustawienia i konfiguracja aplikacji
- app/db/ - połączenie z bazą danych i migracje
- app/models/ - definicje tabel bazy danych (SQLAlchemy)
- app/schemas/ - walidacja danych wejściowych i wyjściowych (Pydantic)
- app/services/ - logika biznesowa systemu
- tests/ - testy jednostkowe i integracyjne

## Dokumentacja API

Po uruchomieniu serwera dokumentacja Swagger UI:
http://127.0.0.1:8000/docs