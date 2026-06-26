# Role i uprawnienia

W systemie są dwie główne role konta: `admin` i `user`. Dodatkowe uprawnienia
wynikają z tego, czy jesteś opiekunem danego przedmiotu albo masz delegację.

## Role kont

| Rola    | Co oznacza                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user`  | Może pracować na przedmiotach, do których ma dostęp, tworzyć nowe przedmioty, używać QR, zgłaszać wypożyczenia i ustawiać własne powiadomienia.                    |
| `admin` | Ma dostęp do wszystkich ekranów i akcji administracyjnych: użytkownicy, grupy, logi audytu, import, usuwanie przedmiotów, wszystkie delegacje i wszystkie raporty. |

## Opiekun przedmiotu

W formularzu przedmiot ma jednego opiekuna: osobę albo grupę. W UI opiekun
jest widoczny w karcie przedmiotu i na liście.

Ważne:

- opiekun jest częścią danych przedmiotu,
- delegacja to osobne, dodatkowe uprawnienie,
- ekran zarządzania delegacjami jest dostępny tylko dla admina albo
  bezpośredniego opiekuna danego przedmiotu.

## Delegacje

Delegacja daje dostęp do konkretnego przedmiotu. Są dwa poziomy:

| Delegacja     | Co daje                                                            |
| ------------- | ------------------------------------------------------------------ |
| `Edycja`      | Zmianę opisu i statusu przedmiotu.                                 |
| `Zarządzanie` | Pełniejszą edycję danych przedmiotu, w tym lokalizację i opiekuna. |

## Dostęp do ekranów

| Ekran           | Kto widzi             |
| --------------- | --------------------- |
| `Dashboard`     | Zalogowany użytkownik |
| `Przedmioty`    | Zalogowany użytkownik |
| `Kategorie`     | Zalogowany użytkownik |
| `Statusy`       | Zalogowany użytkownik |
| `Delegacje`     | Zalogowany użytkownik |
| `Wypożyczenia`  | Zalogowany użytkownik |
| `Skaner QR`     | Zalogowany użytkownik |
| `Druk QR`       | Zalogowany użytkownik |
| `Raporty`       | Zalogowany użytkownik |
| `Powiadomienia` | Zalogowany użytkownik |
| `Import Excel`  | Tylko admin           |
| `Użytkownicy`   | Tylko admin           |
| `Grupy`         | Tylko admin           |
| `Logi audytu`   | Tylko admin           |

## Jak czytać blokady

- `Brak uprawnień` zwykle oznacza, że ekran albo akcja wymaga roli admin.
- Jeśli przycisk jest widoczny, ale zapis kończy się błędem, sprawdź, czy masz
  rolę właściciela, delegację albo wymagane członkostwo w grupie.
- Jeśli przedmiot należy do grupy, grupa jest pokazana jako opiekun, ale
  operacje nadal zależą od konkretnego konta i przypisanych uprawnień.

## Praktyczna reguła

Jeżeli chcesz zmienić dane przedmiotu, najpierw sprawdź trzy rzeczy:

1. Czy jesteś adminem.
2. Czy jesteś bezpośrednim opiekunem przedmiotu.
3. Czy masz delegację `Edycja` albo `Zarządzanie`.

Jeśli żadna z nich nie działa, zapis nie przejdzie.
