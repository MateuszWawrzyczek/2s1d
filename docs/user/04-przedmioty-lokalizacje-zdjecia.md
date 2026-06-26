# Przedmioty, lokalizacje, zdjęcia

To najważniejszy ekran pracy operacyjnej. Tutaj szukasz sprzętu, otwierasz jego
szczegóły, zmieniasz lokalizację, dodajesz zdjęcia i zarządzasz delegacjami.

## Lista przedmiotów

Na liście możesz:

- szukać po nazwie, opisie, modelu, numerze seryjnym, numerze inwentarzowym i
  identyfikatorze systemowym,
- filtrować po producencie, kategorii, statusie, lokalizacji i opiekunie,
- sortować po kolumnach,
- przechodzić między stronami wyników.

Filtr kategorii uwzględnia też podkategorie.

## Dodawanie przedmiotu

1. Kliknij `+ Dodaj przedmiot`.
2. Wpisz nazwę. To jedyne pole wymagane zawsze.
3. Uzupełnij opcjonalnie producenta, model, numer seryjny, numer inwentarzowy,
   opis i datę zakupu.
4. Wybierz kategorię, status i lokalizację, jeśli chcesz.
5. Wybierz opiekuna: osobę albo grupę.
6. Zapisz formularz.

Ważne:

- system może nadać `System ID` automatycznie,
- możesz też wpisać go samodzielnie,
- opiekun jest obowiązkowy,
- nie da się wybrać jednocześnie osoby i grupy jako opiekuna.

## Karta szczegółów

Po kliknięciu wiersza otwierasz kartę przedmiotu. Zobaczysz tam:

- producenta,
- model,
- numer seryjny,
- numer inwentarzowy,
- `System ID`,
- opis,
- status,
- opiekuna,
- lokalizację,
- mapę.

## Edycja

Przycisk `Edytuj przedmiot` otwiera formularz edycji. Zakres pól zależy od
uprawnień:

- `Edycja` pozwala zmienić opis i status,
- `Zarządzanie`, opiekun lub admin widzą pełny formularz,
- admin może dodatkowo usunąć przedmiot.

Jeżeli po zapisaniu pojawia się błąd, najczęściej oznacza to brak prawa do
danej zmiany.

## Lokalizacja

W tej samej karcie możesz pracować z lokalizacją.

### Co można zrobić

1. Wybrać istniejący punkt z listy.
2. Utworzyć nowy punkt lokalizacji.
3. Ustawić współrzędne na mapie albo wpisać je ręcznie.

### Nowy punkt lokalizacji

Przy tworzeniu punktu podajesz:

- nazwę,
- typ `Wewnętrzna` albo `Zewnętrzna`,
- budynek,
- pokój,
- szafę,
- półkę,
- współrzędne mapy.

Możesz kliknąć na mapie albo wpisać `mapX` i `mapY` ręcznie. Jeśli nie masz
uprawnień do lokalizacji, zamiast kontrolek zobaczysz informację o braku prawa
do zmiany.

### Wskazówka praktyczna

- `Wewnętrzna` to typowy punkt w budynku,
- `Zewnętrzna` przydaje się dla sprzętu poza standardową infrastrukturą,
- jeśli lokalizacja nie ma opisów, pozostaje sam punkt na mapie.

## Zdjęcia

W sekcji `Dokumentacja zdjęciowa` możesz:

1. Dodać zdjęcie z pliku.
2. Zobaczyć listę wszystkich dodanych plików.
3. Otworzyć albo pobrać plik, klikając jego nazwę.

Zdjęcia są przydatne, gdy chcesz pokazać stan techniczny albo oznaczenia sprzętu.
Jeżeli upload się nie powiedzie, sprawdź typ pliku i swoje uprawnienia do
przedmiotu.

## Usuwanie

Usunięcie przedmiotu:

- wymaga roli admin,
- wymaga potwierdzenia,
- nie zadziała, jeśli przedmiot ma historię wypożyczeń.

Jeśli przedmiot jest używany operacyjnie, przed usunięciem sprawdź też
powiązane zdjęcia, delegacje i historię zmian.
