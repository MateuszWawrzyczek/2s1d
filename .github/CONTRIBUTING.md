## 1. Branching

Każde zadanie realizujemy na osobnym branchu według wzoru:
`typ/ID-krotki-opis`

**Typy branchy:**

- `feat/` – nowa funkcjonalność
- `fix/` – naprawa błędu
- `docs/` – zmiany w dokumentacji
- `refactor/` – czyszczenie kodu

**Przykład:** `docs/0-konwencja-branchy-i-commitow`

---

## 2. Standard Commitów

Wiadomości commitów powinny być krótkie i opisywać wprowadzoną zmianę. Stosujemy prefiksy zgodne z szablonem PR:

- `feat:` – dodanie nowej funkcji
- `fix:` – poprawka błędu
- `docs:` – aktualizacja plików .md lub dokumentacji Sales
- `refactor:` – zmiana struktury kodu
- `chore:` – zadania administracyjne/konfiguracyjne

## **Przykład:** `docs: dodanie standardów branchingu i commitów`

## 3. Jakość kodu i formatowanie

W projekcie dbamy o spójność kodu. Używamy narzędzi **Ruff** (backend) oraz **ESLint** i **Prettier** (frontend), które są zautomatyzowane za pomocą `pre-commit hooks`.

**Przygotowanie środowiska (uruchom raz po sklonowaniu repozytorium):**

- `pip install pre-commit` – instalacja narzędzia pre-commit
- `pre-commit install` – aktywacja hooków w lokalnym repozytorium

**Przykład uruchomienia skanu wszystkich plików:** `pre-commit run --all-files`
