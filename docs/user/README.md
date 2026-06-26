# Przewodniki użytkownika

Zbiór szczegółowych guide. Każdy plik opisuje jeden obszar aplikacji i można
go czytać osobno.

## Kolejność czytania

1. [Logowanie i konto](01-logowanie.md)
2. [Role i uprawnienia](02-role-i-uprawnienia.md)
3. [Nawigacja i Dashboard](03-nawigacja-i-dashboard.md)
4. [Przedmioty, lokalizacje, zdjęcia](04-przedmioty-lokalizacje-zdjecia.md)
5. [Kategorie i statusy](05-kategorie-i-statusy.md)
6. [Delegacje i grupy](06-delegacje-i-grupy.md)
7. [Wypożyczenia i raporty](07-wypozyczenia-i-raporty.md)
8. [QR, druk i import](08-qr-druk-i-import.md)
9. [Powiadomienia i logi](09-powiadomienia-i-audit.md)
10. [FAQ](10-faq.md)

## Szybki skrót

| Plik                                   | Po co                                              |
| -------------------------------------- | -------------------------------------------------- |
| `01-logowanie.md`                      | Dostęp do systemu, rejestracja, sesja, wylogowanie |
| `02-role-i-uprawnienia.md`             | Kto może co zrobić i jak czytać delegacje          |
| `03-nawigacja-i-dashboard.md`          | Opis wszystkich tabów i kart Dashboardu            |
| `04-przedmioty-lokalizacje-zdjecia.md` | Codzienna praca na przedmiotach                    |
| `05-kategorie-i-statusy.md`            | Słowniki i ich ograniczenia                        |
| `06-delegacje-i-grupy.md`              | Nadawanie dostępu i zarządzanie grupami            |
| `07-wypozyczenia-i-raporty.md`         | Obieg wypożyczeń i raport przetrzymań              |
| `08-qr-druk-i-import.md`               | QR, etykiety, import danych                        |
| `09-powiadomienia-i-audit.md`          | Przypomnienia i historia zmian                     |
| `10-faq.md`                            | Najczęstsze pytania i awarie                       |

## Zasada ogólna

Jeśli w dokumencie widzisz komunikat o braku uprawnień, traktuj go jako
źródło prawdy. W tej aplikacji część działań zależy od:

- roli konta `admin` albo `user`,
- bycia opiekunem konkretnego przedmiotu,
- delegacji `Edycja` albo `Zarządzanie`,
- członkostwa w grupie, jeśli delegacja została nadana grupie.
