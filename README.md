# System Zarządzania Inwentaryzacją

System służy do ewidencji aparatury pomiarowej AGH, obsługi wypożyczeń,
lokalizacji, kodów QR i uprawnień do przedmiotów.

Instrukcja dla użytkowników: [docs/INSTRUKCJA_UZYTKOWNIKA.md](docs/INSTRUKCJA_UZYTKOWNIKA.md).

Rozszerzone przewodniki użytkownika: [docs/user/README.md](docs/user/README.md).

Instrukcja wdrożenia Docker: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Produkcja działa przez Docker: `docker compose up --build -d` po ustawieniu
sekretów w `.env`. `DEV_BYPASS_AUTH=false` jest domyślne; tryb bypass zostaje
tylko do lokalnego developmentu.

Adres działającej instalacji oraz pomoc w sprawie konta przekazuje administrator
systemu.
