# Wypożyczenia i raporty

To ekran obiegu sprzętu: wniosek, zatwierdzenie, wydanie, zwrot i raport
przetrzymań.

## Tryby wypożyczeń

W formularzu wniosku wybierasz jeden z trybów:

- `Klasyczne`,
- `Zaufane`,
- `Asynchroniczne`.

W aktualnym obiegu wszystkie trzy tryby przechodzą przez wniosek i
zatwierdzenie. `Zaufane` działa jak osobna etykieta organizacyjna, a różnice
praktyczne wychodzą przy wydaniu i zwrocie.

## Statusy

| Status          | Co oznacza                                     |
| --------------- | ---------------------------------------------- |
| `Oczekuje`      | Wniosek został utworzony, ale nie ma decyzji.  |
| `Zarezerwowane` | Wniosek zatwierdzono, sprzęt czeka na wydanie. |
| `Wypożyczone`   | Sprzęt został wydany.                          |
| `Zwrócone`      | Wypożyczenie zakończone.                       |
| `Odrzucone`     | Wniosek został odrzucony.                      |

## Nowy wniosek

1. Otwórz `Wypożyczenia`.
2. Kliknij `Nowy wniosek`.
3. Wybierz przedmiot.
4. Wybierz tryb.
5. Podaj planowany termin zwrotu.
6. Zapisz.

Wniosek musi mieć termin zwrotu w przyszłości. Jeśli przedmiot ma już aktywne
wypożyczenie, system nie pozwoli utworzyć nowego.

## Zatwierdzenie i odrzucenie

Wniosek może zatwierdzić lub odrzucić:

- admin,
- opiekun przedmiotu.

Po zatwierdzeniu sprzęt trafia do stanu `Zarezerwowane`.

## Wydanie

Po zatwierdzeniu kliknij `Wydaj`.

Wydanie może wykonać:

- admin,
- opiekun,
- w trybie `Asynchroniczne` także osoba wypożyczająca.

## Zwrot

Gdy sprzęt wraca, kliknij `Zwrot` i potwierdź operację.

- w trybie `Klasyczne` zwrot potwierdza admin albo opiekun,
- w pozostałych trybach zwrot może potwierdzić też osoba wypożyczająca.

Możesz dodać komentarz do zwrotu, na przykład o stanie sprzętu.

## Wypożyczenie zewnętrzne

`Wypożyczenie zewnętrzne` służy do wydań poza standardowym obiegiem.

1. Kliknij `Wypożyczenie zewnętrzne`.
2. Wybierz przedmiot.
3. Wpisz nazwę osoby albo instytucji.
4. Podaj planowany zwrot.
5. Kliknij `Wypożycz`.

To może zrobić tylko admin albo opiekun przedmiotu. Wpis od razu trafia do
stanu `Wypożyczone`.

## Historia

Niżej widać tabelę historii:

- ID wypożyczenia,
- przedmiot,
- odbiorca,
- tryb,
- status,
- planowany zwrot,
- data utworzenia.

Historia pokazuje już zakończone wpisy i pozwala szybko prześledzić obieg
sprzętu.

## Raport przetrzymań

Tab `Raporty` pokazuje wypożyczenia, których termin zwrotu minął.

- admin widzi cały system,
- zwykły użytkownik widzi tylko swoje przedmioty albo przedmioty, za które
  odpowiada.

Z raportu można pobrać:

- `CSV`,
- `PDF`.

## Najważniejsze blokady

- nie można wypożyczyć drugi raz aktywnie wypożyczonego przedmiotu,
- nie można zatwierdzić wniosku, który nie jest w stanie oczekiwania,
- nie można zwrócić sprzętu, który nie jest aktualnie wypożyczony.
