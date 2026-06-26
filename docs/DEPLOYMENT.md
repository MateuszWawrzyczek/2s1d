# Wdrożenie produkcyjne

## Wariant Docker

Docker jest obecnie główną ścieżką uruchomienia. Kontener aplikacji uruchamia
serwer Node/Hono, serwuje zbudowane pliki SPA z `dist/client`, API `/api/*`
oraz pliki zdjęć przez `/storage/*`.

1. Skopiuj `.env.example` do `.env`.
2. Ustaw mocne wartości:
   - `MYSQL_ROOT_PASSWORD`,
   - `MYSQL_PASSWORD`,
   - `JWT_SECRET` (minimum 32 losowe znaki),
   - `GOOGLE_CLIENT_ID` dla produkcyjnego logowania przez AGH Google SSO,
   - `INITIAL_ADMIN_EMAIL`,
   - `INITIAL_ADMIN_PASSWORD` (minimum 12 znaków, tylko do pierwszego seeda).
     Opcjonalnie dostosuj `DB_CONNECTION_LIMIT` do limitów MySQL i liczby
     instancji aplikacji.
3. Upewnij się, że `DEV_BYPASS_AUTH=false`. Walidator Docker blokuje produkcyjne
   uruchomienie z `DEV_BYPASS_AUTH=true`, placeholderami albo zbyt krótkim
   `JWT_SECRET`.
4. Jeżeli aplikacja działa za reverse proxy, ustaw `TRUST_PROXY=true` tylko wtedy,
   gdy proxy usuwa przychodzące od klienta `X-Forwarded-For`, `X-Real-IP` i
   ustawia je samodzielnie. Bez tego zostaw `TRUST_PROXY=false`.
5. Sprawdź konfigurację przed startem:

```bash
set -a
. ./.env
set +a
docker compose --env-file .env config >/dev/null
MYSQL_HOST=db MYSQL_USER="$MYSQL_USER" MYSQL_PASSWORD="$MYSQL_PASSWORD" \
  MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" MYSQL_DATABASE="$MYSQL_DATABASE" \
  JWT_SECRET="$JWT_SECRET" \
  GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" INITIAL_ADMIN_EMAIL="$INITIAL_ADMIN_EMAIL" \
  INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD" \
  DEV_BYPASS_AUTH="$DEV_BYPASS_AUTH" TRUST_PROXY="$TRUST_PROXY" \
  NOTIFICATIONS_INTERVAL_MINUTES="$NOTIFICATIONS_INTERVAL_MINUTES" \
  DB_CONNECTION_LIMIT="$DB_CONNECTION_LIMIT" DB_QUEUE_LIMIT="$DB_QUEUE_LIMIT" \
  pnpm run validate:docker
```

6. Zbuduj i uruchom. `docker compose up` najpierw uruchamia MySQL, następnie
   jednorazowy kontener migracji i seedów, a dopiero potem aplikację:

```bash
docker compose up --build -d
```

7. Jeżeli chcesz ręcznie ponowić same migracje i seedy, uruchom:

```bash
docker compose build migrate
docker compose run --rm migrate
```

Zdjęcia są przechowywane w wolumenie `photos_data`. Baza danych w wolumenie
`mysql_data`. Oba wolumeny muszą mieć backup i test odtworzenia.
Kontener zapisuje zdjęcia w `/data/photos`; `docker-compose.yml` mapuje ten
katalog na wolumen `photos_data`.

Przykład wygenerowania sekretów:

```bash
openssl rand -base64 48
```

Backup:

```bash
scripts/backup-docker.sh
```

Skrypt tworzy katalog `backups/<timestamp>/` z `mysql.sql` oraz
`photos.tar.gz`. Katalog `backups/` jest ignorowany przez Git.

Test odtworzenia w środowisku testowym:

```bash
scripts/restore-docker.sh backups/<timestamp> --force
docker compose build migrate
docker compose run --rm migrate
curl --fail http://127.0.0.1:${APP_PORT:-8787}/api/health
```

Restore nadpisuje dane w bazie i wolumenie zdjęć, dlatego wymaga jawnego
`--force`.

Serwer Docker uruchamia cykliczne tworzenie powiadomień in-app o zbliżającym
się terminie zwrotu. Domyślny interwał to 60 minut (`NOTIFICATIONS_INTERVAL_MINUTES=60`).
Jednorazowe uruchomienie zadania:

```bash
docker compose exec app pnpm run notifications:run
```

Kanały e-mail i push są celowo wyłączone w API, dopóki nie zostanie podłączony
dostawca wysyłki.

## Reverse Proxy, TLS i logi

Kontener aplikacji nasłuchuje HTTP na porcie `8787`. W produkcji wystaw go przez
reverse proxy z TLS, np. nginx, Caddy, Traefik albo bramę uczelnianą.

Wymagania dla proxy:

- wymuszaj HTTPS i przekierowanie HTTP -> HTTPS;
- ustaw HSTS na domenie produkcyjnej po potwierdzeniu poprawnego certyfikatu;
- limituj rozmiar body do co najmniej 10 MB plus narzut multipart, bo zdjęcia
  mają limit aplikacyjny 10 MB;
- przekazuj `Host`, `X-Forwarded-Proto`, `X-Forwarded-For`;
- jeżeli ustawiasz `TRUST_PROXY=true`, proxy musi usuwać wersje tych nagłówków
  przysłane przez klienta przed dodaniem własnych;
- kieruj `/api/*`, `/storage/*` i pozostałe ścieżki do tego samego kontenera,
  bo API, zdjęcia i SPA routing obsługuje serwer Node.

Logi aplikacji są strukturalne JSON na stdout/stderr. Produkcyjne uruchomienie
musi mieć skonfigurowaną retencję logów poza kontenerem (np. journald, Loki,
ELK, Cloud logging) oraz alert dla restart loopów i błędów `return due notifications failed`.

Po wdrożeniu sprawdź:

- `GET /api/health` zwraca `200` oraz `{"status":"ok","database":"ok"}`;
- logowanie Google działa dla skonfigurowanego administratora;
- niezalogowane `GET /api/v1/items/` zwraca `401`;
- dodanie, odczyt i pobranie zdjęcia działa z wolumenu zdjęć;
- backup MySQL i `photos_data` można odtworzyć w środowisku testowym.

## AGH Google SSO w Dockerze

Backend nie używa sekretu klienta Google ani zakresów dostępu do API Google.
Frontend używa Google Identity Services jako logowania SSO, pobiera
`credential` z tokenem ID i wysyła go do `POST /api/v1/auth/google-login`.
Backend weryfikuje token przez Google `tokeninfo`, sprawdza `aud` względem
`GOOGLE_CLIENT_ID`, wymaga claimu `hd` Google Workspace oraz dopuszcza tylko
domeny `agh.edu.pl` i `student.agh.edu.pl`.

W Google Cloud Console skonfiguruj identyfikator klienta typu **Web application**
dla Sign in with Google:

- `Authorized JavaScript origins`: publiczny adres aplikacji, np.
  `https://inventory.example.edu.pl`;
- `Authorized redirect URIs`: nie są używane przez ten flow, ale Google Cloud
  może wymagać wpisu; użyj publicznego adresu aplikacji lub jego ścieżki
  logowania, zgodnie z UI Google Cloud;
- `GOOGLE_CLIENT_ID` w `.env`: pełny identyfikator kończący się
  `.apps.googleusercontent.com`.

`DEV_BYPASS_AUTH=true` pozwala w development traktować `credential` jako email,
ale nadal akceptuje tylko `@agh.edu.pl` i `@student.agh.edu.pl`. Nie wolno
używać tego trybu w Docker production; `scripts/validate-docker-env.mjs` blokuje
taki start.
