# QR, druk i import

Ten zestaw guide obejmuje skaner kodów, etykiety PDF i import danych z arkusza.

## Skaner QR

Skaner działa na dwa sposoby:

- możesz wpisać kod ręcznie,
- możesz uruchomić kamerę i odczytać QR z urządzenia mobilnego lub laptopa.

### Jak użyć

1. Otwórz `Skaner QR`.
2. Wpisz kod albo kliknij `Skanuj kamerą`.
3. Po odczycie sprawdź nazwę, kod, lokalizację i status.
4. Jeśli masz prawa edycji, możesz wybrać `Oznacz jako uszkodzony`.

### Co warto wiedzieć

- kamera działa tylko w przeglądarkach, które wspierają `BarcodeDetector`,
- jeśli przeglądarka nie obsługuje tej funkcji, użyj ręcznego wpisania kodu,
- kod może pochodzić z etykiety albo z identyfikatora przedmiotu.

## Oznaczanie jako uszkodzony

Ta akcja jest dostępna tylko wtedy, gdy możesz edytować przedmiot.

Jeżeli status `Uszkodzony` już istnieje, system nie zmienia go ponownie i
pokazuje odpowiedni komunikat.

## Druk QR

1. Otwórz `Druk QR`.
2. Zaznacz przedmioty albo użyj `Zaznacz wszystkie`.
3. Wybierz rozmiar etykiety: `Mały`, `Średni` albo `Duży`.
4. Kliknij `Pobierz PDF`.

To dobry sposób na przygotowanie nowych etykiet po imporcie albo po zakupie
sprzętu.

### Limit praktyczny

W jednej paczce można wybrać do 100 przedmiotów. Jeśli masz więcej, podziel
druk na kilka plików.

## Import danych

Import jest przeznaczony dla administratora.

### Jak importować

1. Otwórz `Import Excel`.
2. Wybierz plik `.xlsx`.
3. Sprawdź mapowanie kolumn.
4. Kliknij `Importuj`.
5. Przeczytaj raport po zakończeniu.

### Obsługiwane pola

- `name`,
- `manufacturer`,
- `description`,
- `purchase_date`,
- `category_id`,
- `status_id`,
- `location_id`,
- `owner_id`.

### Ograniczenia importu

- plik musi mieć co najmniej jeden wiersz danych,
- maksymalny rozmiar pliku to 5 MB,
- maksymalnie 500 wierszy,
- pole `name` jest wymagane w każdym wierszu,
- błędne wiersze są raportowane osobno.

### Raport importu

Po imporcie zobaczysz:

- liczbę przetworzonych wierszy,
- liczbę zaimportowanych wierszy,
- listę błędów z numerami wierszy.

Jeśli pojedynczy wiersz się nie powiedzie, pozostałe nadal mogą zostać
zaimportowane.
