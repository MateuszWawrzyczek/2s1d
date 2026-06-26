# Kategorie i statusy

Te dwa ekrany porządkują dane słownikowe. Kategorie budują drzewo, a statusy
opisują stan przedmiotów.

## Kategorie

Ekran `Kategorie` pokazuje drzewo:

- kategorie główne,
- podkategorie,
- przyciski dodawania, edycji i usuwania.

### Dodawanie

1. Wybierz `Nowa kategoria główna` albo `+ Dodaj` przy istniejącej gałęzi.
2. Wpisz nazwę.
3. Zapisz.

Podkategoria dziedziczy tylko położenie w drzewie. Nazwa musi być unikalna w
obrębie jednego rodzica.

### Edycja i przenoszenie

Możesz zmienić nazwę kategorii i jej rodzica. System blokuje:

- cykl w drzewie,
- ustawienie kategorii jako własnego rodzica,
- duplikat nazwy pod tym samym rodzicem.

### Usuwanie

Kategorii nie można usunąć, jeśli ma podkategorie. Jeśli kategoria jest używana
przez przedmioty, po usunięciu przedmioty zostają bez kategorii.

## Statusy

Ekran `Statusy` rozróżnia dwa typy:

| Typ         | Co oznacza                                                   |
| ----------- | ------------------------------------------------------------ |
| `Systemowy` | Status chroniony, nie można go edytować ani usuwać.          |
| `Własny`    | Status dodany przez użytkownika, można go zmieniać i usuwać. |

### Systemowe statusy

W systemie spotkasz m.in.:

- `Dostępny`,
- `W użyciu`,
- `W naprawie`,
- `Uszkodzony`,
- `Wypożyczony`,
- `Zarezerwowany`,
- `Zarchiwizowany`,
- `Oczekuje zatwierdzenia`.

### Własne flagi

Własne flagi służą do rozszerzenia słowników, gdy standardowe statusy nie
wystarczają. W formularzu dodawania podajesz nazwę i opis.

### Ograniczenia

- status systemowy ma ikonę blokady i nie da się go edytować,
- statusy własne można edytować i usuwać,
- nazwy statusów muszą być unikalne.

### Gdzie statusy są używane

- przy tworzeniu i edycji przedmiotu,
- w raporcie i filtrach,
- w skanerze QR,
- w szybkiej akcji `Oznacz jako uszkodzony`.
