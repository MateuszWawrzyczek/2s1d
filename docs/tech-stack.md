# Stack technologiczny i uzasadnienie

Wybraliśmy poniższe technologie na podstawie analizy umiejętności członków zespołu oraz wymagań projektu:

### Core Stack

- **Backend:** FastAPI + Python – wybrany ze względu na wysoką wydajność i automatyczną dokumentację Swagger. Przy prostej składni Pythona pozwoli to całemu zespołowi na szybkie wdrażanie nowych endpointów.
- **Frontend:** React + TypeScript – zapewnia bezpieczeństwo typów i reużywalność komponentów.
- **Baza danych:** PostgreSQL – naturalny wybór dla danych relacyjnych w tym stacku.

### Narzędzia i Infrastruktura

- **DevOps:** Docker + Docker Compose – standard do lokalnego uruchamiania całego środowiska.
- **ORM/Migracje:** SQLAlchemy + Alembic – do obsługi bazy z poziomu Pythona.
- **Auth:** Na start mock/dev auth (do celów programistycznych), docelowo planowane przejście na SSO AGH.
- **Storage:** Lokalny storage wewnątrz kontenerów na etapie deweloperskim.

### Testowanie

- **Backend:** pytest
- **Frontend:** Playwright / Vitest
