# Logowanie i konto

Ten ekran jest pierwszym wejściem do systemu. Jeśli nie ma aktywnej sesji,
chronione widoki pokazują komunikat `Wymagane logowanie`.

## Dostępne metody

### AGH Google SSO

1. Otwórz ekran logowania.
2. Jeśli wdrożenie ma skonfigurowany Google Sign-In, kliknij przycisk Google.
3. Wybierz konto w domenie `@agh.edu.pl` albo `@student.agh.edu.pl` i potwierdź
   logowanie.
4. System utworzy sesję i przeniesie Cię do aplikacji.

Jeśli konfiguracja Google nie jest dostępna, ekran pokaże informację o braku
`GOOGLE_CLIENT_ID` i zasugeruje logowanie e-mailem.

### Logowanie e-mailem

1. Wpisz adres e-mail.
2. Wpisz hasło.
3. Kliknij `Zaloguj`.

To podstawowa ścieżka dla kont lokalnych.

### Rejestracja

1. Wpisz adres e-mail.
2. Ustaw hasło o długości co najmniej 8 znaków.
3. Kliknij `Zarejestruj`.

Po rejestracji konto jest gotowe od razu. Nie ma osobnego kroku zatwierdzania
w aplikacji.

## Wylogowanie

Kliknij `Wyloguj` w lewym dolnym rogu menu.

Po wylogowaniu:

- sesja jest usuwana z przeglądarki,
- chronione strony wracają do ekranu logowania,
- po wygaśnięciu tokena trzeba zalogować się ponownie.

## Tryb deweloperski

W części instalacji może być włączony `DEV_BYPASS_AUTH`. Wtedy ekran logowania
pokazuje dodatkowy panel testowy. To tryb wyłącznie dla środowiska
developerskiego i akceptuje tylko adresy `@agh.edu.pl` lub
`@student.agh.edu.pl`.

## Najczęstsze komunikaty

- `Wymagane logowanie` oznacza, że nie masz aktywnej sesji.
- `Brak uprawnień` oznacza, że Twoja rola nie wystarcza do wejścia na dany
  ekran.
- `Nie udało się pobrać konfiguracji logowania` oznacza problem po stronie
  wdrożenia albo sieci.
