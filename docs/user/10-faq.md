# FAQ

Najczęstsze pytania i szybkie odpowiedzi.

## Nie mogę wejść do systemu

Sprawdź, czy jesteś zalogowany. Jeśli widzisz `Wymagane logowanie`, wróć do
ekranu logowania i zaloguj się ponownie.

## Widzę `Brak uprawnień`

Oznacza to, że Twoja rola albo delegacja nie wystarcza do tej operacji. Dla
ekranów admin-only jedyną odpowiedzią jest konto `admin`.

## Konto z rejestracji nie działa

W tej wersji aplikacji konto lokalne jest aktywne od razu po rejestracji.
Jeśli logowanie nadal nie działa, sprawdź e-mail i hasło albo skontaktuj się z
administratorem.

## Kamera QR nie działa

Najczęściej:

- przeglądarka nie wspiera `BarcodeDetector`,
- przeglądarka zablokowała dostęp do kamery,
- urządzenie nie ma aktywnej kamery.

W takiej sytuacji wpisz kod ręcznie.

## Nie mogę edytować przedmiotu

Sprawdź, czy jesteś:

1. adminem,
2. bezpośrednim opiekunem przedmiotu,
3. osobą z delegacją `Edycja` albo `Zarządzanie`.

Jeśli nie, zapis zostanie zablokowany.

## Nie mogę zmienić lokalizacji

Do zmiany lokalizacji potrzebujesz pełniejszych uprawnień do przedmiotu.
Jeżeli panel lokalizacji pokazuje tylko komunikat informacyjny, nie masz
wystarczającej roli albo delegacji.

## Nie mogę usunąć przedmiotu

Usuwanie jest tylko dla admina i nie działa, jeśli przedmiot ma historię
wypożyczeń.

## Wypożyczenie ma błąd daty

Termin zwrotu musi być w przyszłości. Jeśli data jest pusta albo już minęła,
formularz nie pozwoli zapisać wniosku.

## Przedmiot już jest wypożyczony

System blokuje drugie aktywne wypożyczenie tego samego przedmiotu. Najpierw
dokończ albo zamknij bieżący obieg.

## Import zwrócił błędy w wierszach

Sprawdź numer wiersza z raportu. Najczęściej problemem jest:

- brak nazwy,
- błędny identyfikator kategorii, statusu, lokalizacji albo opiekuna,
- zły format arkusza,
- za duży plik.

## Nie widzę e-maili ani push

To normalne. W tej wersji systemu powiadomienia są wyłącznie in-app.

## Dashboard pokazuje `Błąd` albo `Nieznany`

To problem z połączeniem do bazy albo z backendem. Nie naprawisz tego z
poziomu konta użytkownika. Zgłoś to administratorowi.

## Nie widzę `Import Excel`

Link może być widoczny tylko częściowo zależnie od konfiguracji menu, ale sam
import i tak działa wyłącznie dla admina. Jeśli otworzysz ekran bez roli
`admin`, zobaczysz blokadę.

## Chcę wiedzieć, kto zmienił dane

Otwórz `Logi audytu`. To jedyne miejsce, gdzie widać pełną historię zmian w
systemie.
