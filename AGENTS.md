# AGENTS.md — pz-worker

Zintegrowany i wszechstronny system do zarządzania bazą danych aparatury pomiarowej AGH.

## Stack

| Warstwa    | Technologia                                          |
| ---------- | ---------------------------------------------------- |
| Runtime    | Docker + Node 22 (`src/server.ts`)                   |
| Framework  | [Hono](https://hono.dev/)                            |
| ORM        | [Drizzle](https://orm.drizzle.team/) + `drizzle-kit` |
| DB         | MySQL 8.4 w Docker Compose                           |
| Frontend   | React 19 + Vite 8 + react-router-dom 7               |
| Testy      | Vitest 3                                             |
| Środowisko | Nix (`flake.nix`), `pnpm` jako package manager       |
| Walidacja  | Zod + `@hono/zod-validator`                          |
| Ikony      | lucide-react                                         |

## Struktura projektu

```
src/
├── index.ts                  # Hono app
├── server.ts                 # Produkcyjny serwer Node dla Docker
├── db/
│   ├── schema.ts             # 12 tabel Drizzle (MySQL)
│   ├── client.ts             # MySQL config → mysql2 → Drizzle
│   ├── seed.ts               # Systemowe statusy + domyślne lokalizacje + slugify
│   └── migrations/           # Migracje SQL generowane przez drizzle-kit
├── middleware/
│   ├── auth.ts               # JWT (HS256, Web Crypto), authMiddleware
│   └── db.ts                 # dbMiddleware — per-request DB connection
├── routes/
│   ├── auth.ts               # /google-login, /register, /users, /config
│   ├── items.ts              # CRUD przedmiotów + filtrowanie
│   ├── categories.ts         # Drzewo kategorii + detekcja cykli
│   ├── statuses.ts           # Statusy systemowe (nieusuwalne) + custom
│   ├── locations.ts          # Lokalizacje (building/room/cabinet/shelf, mapX/Y)
│   ├── borrowings.ts         # 4 tryby wypożyczeń + overdue raport
│   ├── delegations.ts        # Delegacje (manage/edit, user/group)
│   ├── groups.ts             # Grupy użytkowników + członkostwo
│   ├── users.ts              # Lista/approve/role
│   ├── qr-codes.ts           # Skanowanie QR (/scan/:qrData)
│   ├── quick-action.ts       # Szybkie akcje (/mark-damaged)
│   ├── batch-qr.ts           # Drukowanie zbiorcze kodów QR
│   ├── excel-import.ts       # Import CSV
│   ├── item-photos.ts        # Zdjęcia (lokalny storage / S3-compatible)
│   ├── notifications.ts      # Preferencje + eventy
│   └── audit-logs.ts         # Logi operacji (admin only)
├── lib/
│   └── errors.ts             # AppError + notFound/badRequest/forbidden/unauthorized
├── client/                   # React SPA (Vite)
│   ├── main.tsx / App.tsx / router.tsx
│   ├── components/           # Layout, AuthGate, Autocomplete, CategoryTree, itd.
│   ├── pages/                # Wszystkie strony (Items, QrScanner, BatchQr, Borrowings, itd.)
│   ├── services/             # Klienckie serwisy API (z mockami dla MODE=test)
│   ├── types/                # TypeScript typy
│   └── hooks/                # useAuth
```

## Dev — komendy

Wszystkie komendy uruchamiane w `nix develop`:

```bash
# Środowisko
nix develop                        # devShell z node + pnpm (flake.nix)

# DB
docker compose up db               # MySQL 8.4 na localhost:3306
pnpm run db:migrate                # Aplikuj migracje
pnpm run db:generate               # Generuj migrację ze zmian w schema.ts

# Dev / Docker
docker compose up --build          # Produkcyjny kształt lokalnie → localhost:8787
docker compose --profile tools run --rm migrate
pnpm run dev                       # Docker Compose (główna ścieżka)

# TypeScript
pnpm exec tsc --noEmit             # Type check

# Testy
pnpm run test:logic                                    # Testy logiki (szybkie)
pnpm exec vitest run --config vitest.client.config.ts   # Testy klienckie (jsdom)
pnpm test                          # Logika + testy klienta
```

## Testy — ważne

- **`vitest.client.config.ts`** (client tests) — lekkie, jsdom, działają szybko. Te testy są bezpieczne lokalnie.
- Serwisy klienckie mają wbudowane mocki (sprawdzają `import.meta.env.MODE === 'test'`), więc testy klienckie nie potrzebują działającego backendu ani bazy danych.
- `tests/business-logic.test.ts` — testuje `slugify` i stałe z `seed.ts`, czysta logika, szybkie.

## Baza danych — tabele

| Tabela                     | Opis                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `categories`               | Drzewo kategorii (self-referencing FK parent_id)                                       |
| `item_status`              | Statusy (systemowe is_system=true + custom)                                            |
| `items`                    | Przedmioty (system_id, nazwa, producent, model, serial, nr_inw, itd.) + legacy_item_id |
| `locations`                | Lokalizacje (building/room/cabinet/shelf/mapX/mapY)                                    |
| `borrowings`               | Wypożyczenia (4 tryby: classic/trusted/asynchronous/external)                          |
| `delegations`              | Delegacje uprawnień (manage/edit, user_id/group_id)                                    |
| `users`                    | Użytkownicy (email, hashed_password, role, is_approved)                                |
| `groups`                   | Grupy użytkowników                                                                     |
| `group_members`            | Członkostwo w grupach (PK: group_id + user_id)                                         |
| `item_photos`              | Zdjęcia przedmiotów (storage_path)                                                     |
| `audit_logs`               | Logi zdarzeń (user_id, action, old_value, new_value JSON)                              |
| `notification_preferences` | Preferencje powiadomień per user                                                       |
| `notification_events`      | Zdarzenia powiadomień (return_due, borrowing_approved)                                 |

## Auth

- **Google OAuth**: `POST /api/v1/auth/google-login` — body: `{ credential }` (Google ID token). Backend weryfikuje token przez Google `tokeninfo`, sprawdza domenę `@agh.edu.pl`, tworzy/linkuje użytkownika z `auth_provider = "google"`.
- **Dev bypass**: `DEV_BYPASS_AUTH="true"` pomija weryfikację tokenu — `credential` traktowany jako email (tylko development).
- **Rejestracja**: `POST /api/v1/auth/register` — body: `{email, password: min 8}` → konto `is_approved: false`, `auth_provider: "local"`.
- **JWT**: HS256 z Web Crypto API. Secret z `c.env.JWT_SECRET`. Token ważny 24h.
- **Role**: `admin` / `user`. Domyślnie po rejestracji brak uprawnień — admin musi zatwierdzić.

## Obsługa błędów API

- `src/lib/errors.ts` — rzuca `AppError(HTTPException)` z kodem i komunikatem
- `index.ts` `onError` — łapie HTTPException → `{detail}` z kodem; nieobsłużone → 500
- Serwisy klienckie: `handleApiError` / `ensureOk` parsują `response.json().detail`

## Wymagania — pokrycie

| Etap | US                                                        | Status                                     |
| ---- | --------------------------------------------------------- | ------------------------------------------ |
| 1    | US-01 Hierarchia kategorii + flagi statusów               | ✅                                         |
| 1    | US-02 Dodawanie przedmiotów                               | ✅                                         |
| 1    | US-03 Identyfikacja (QR, systemId)                        | ✅                                         |
| 1    | US-04 Szybkie akcje po QR                                 | ✅                                         |
| 1    | US-05: Dokumentacja zdjęciowa                             | ✅                                         |
| 1    | Lokalizacja US-01 Przypisanie/aktualizacja                | ✅                                         |
| 1    | Lokalizacja US-02 Podgląd na mapie                        | ✅                                         |
| 1    | Role US-01 Opiekun/grupa                                  | ✅                                         |
| 1    | Role US-03 Google OAuth (konto @agh.edu.pl) + rejestracja | ✅                                         |
| 1    | Wypożyczenia US-01 (classic)                              | ✅                                         |
| 1    | Narzędzia US-01 Zaawansowane filtrowanie                  | ✅                                         |
| 2    | US-05 Zdjęcia                                             | ✅                                         |
| 2    | Role US-02 Delegacje                                      | ✅                                         |
| 2    | Role US-04 Brak publicznego dostępu                       | ✅                                         |
| 2    | Wypożyczenia US-02 (trusted)                              | ✅                                         |
| 2    | Wypożyczenia US-03 (asynchronous)                         | ✅                                         |
| 2    | Wypożyczenia US-05 Raport przetrzymań                     | ✅                                         |
| 2    | Narzędzia US-02 Audit log                                 | ✅                                         |
| 2    | Narzędzia US-04 Migracja (Excel/CSV)                      | ✅ (CSV)                                   |
| 3    | Wypożyczenia US-04 (external)                             | ✅                                         |
| 3    | Narzędzia US-03 Powiadomienia                             | ✅ (struktura, brak faktycznego wysyłania) |
| 3    | Narzędzia US-04 Migracja z poprzedniego systemu           | ⚠️ (do doprecyzowania)                     |
| 3    | Narzędzia US-05 Drukowanie etykiet                        | ✅ (batch QR, jsPDF + qrcode)              |

## Znane problemy / ograniczenia

1. **Powiadomienia** — Docker runtime tworzy cykliczne eventy in-app; e-mail/push nadal nie mają dostawcy wysyłki.
2. **Reverse proxy** — produkcyjny Docker wystawia HTTP; TLS/HSTS/log retention muszą być na zewnętrznym proxy. `TRUST_PROXY=true` tylko gdy proxy czyści i ustawia nagłówki forwarded.
3. **Mapa** — mapa Leaflet została zintegrowana w widoku przedmiotów.
4. **E2E** — katalog `e2e/` istnieje, `playwright.config.ts` jest, ale testy nie są zaimplementowane.
5. **Google OAuth** — działa z kontami Google w domenie `@agh.edu.pl`.
6. **Baza referencyjna koidc** — aplikacja wspiera współistnienie z tabelami referencyjnymi (`inv_urzadzenia`, `pracownicy`, `publikacje`, itd.) z bazy `2025-03-06_koidc.sql`. Tabele referencyjne są read-only. Import danych do tabel aplikacji przez `src/db/import-koidc.ts`. Pracownicy są dostępni przez API `/api/v1/staff`. W development `DEV_BYPASS_AUTH=true` pomija weryfikację tokenu. Wymagany `GOOGLE_CLIENT_ID` z Google Cloud Console.

## Konwencje kodu

- **TypeScript**: strict mode, ESNext target, bundler module resolution
- **Backend routes**: Hono router, każdy route w osobnym pliku, reuse `authMiddleware` + `dbMiddleware`
- **API shape**: `POST/PATCH` z JSON body walidowanym przez `zValidator`, błędy przez `AppError`
- **Frontend services**: każdy service ma tryb mock (`USE_MOCKS = import.meta.env.MODE === 'test'`)
- **Testy**: `describe`/`it` Vitest, mocki w service'ach (nie mockuje się fetch)
