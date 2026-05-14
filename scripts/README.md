# Skrypty pomocnicze

## Wymagania
* Docker i Docker Compose
* macOS / Linux: terminal
* Windows: PowerShell z Git Bashem:
  ```powershell
  & "C:\Program Files\Git\bin\bash.exe"
  ```
  Następnie przejdź do roota projektu przed uruchomieniem skryptów:
  ```bash
  cd /c/Users/<nazwa>/Desktop/2s1d
  ```

## setup.sh

Pierwsza konfiguracja projektu. Przy pierwszym uruchomieniu kopiowane jest `.env.example` -> `.env`. Następnie należy uzupełnić zmienne w `.env` i uruchomić ponownie skrypt.
```bash
sh scripts/setup.sh
```