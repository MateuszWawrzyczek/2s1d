import { expect, test, type Page, type Route } from '@playwright/test';

const user = {
  id: 1,
  email: 'pracownik@agh.edu.pl',
  role: 'admin',
  is_active: true,
};

interface CategoryFixture {
  id: number;
  name: string;
  parent_id: number | null;
  description: string;
}

const categories: CategoryFixture[] = [
  {
    id: 1,
    name: 'Urządzenia',
    parent_id: null,
    description: 'Sprzęt uczelni',
  },
  {
    id: 2,
    name: 'Pomiarowe',
    parent_id: 1,
    description: 'Urządzenia pomiarowe',
  },
  {
    id: 3,
    name: 'Oscyloskopy',
    parent_id: 2,
    description: 'Dowolny poziom zagłębienia',
  },
];

const statuses = [
  { id: 1, name: 'Dostępny', is_system: true },
  { id: 2, name: 'Wypożyczony', is_system: true },
  { id: 3, name: 'Zarezerwowany', is_system: true },
  { id: 4, name: 'Uszkodzony', is_system: true },
  { id: 5, name: 'Oczekuje zatwierdzenia', is_system: true },
  { id: 6, name: 'Zaginiony', is_system: false },
];

const locations = [
  {
    id: 1,
    name: 'D-17 / 101 / Szafa A / Półka 2',
    kind: 'internal',
    building: 'D-17',
    room: '101',
    cabinet: 'Szafa A',
    shelf: 'Półka 2',
    mapX: 35,
    mapY: 45,
  },
  {
    id: 2,
    name: 'Delegacja CERN',
    kind: 'external',
    building: 'CERN',
    room: null,
    cabinet: null,
    shelf: null,
    mapX: null,
    mapY: null,
  },
];

const owners = [
  { id: 1, email: 'opiekun@agh.edu.pl' },
  { id: 2, email: 'laborant@agh.edu.pl' },
];

const managedUsers = [
  {
    id: 1,
    email: 'pracownik@agh.edu.pl',
    role: 'admin' as const,
    isActive: true,
  },
  {
    id: 2,
    email: 'nowy.pracownik@agh.edu.pl',
    role: 'user' as const,
    isActive: true,
  },
  {
    id: 3,
    email: 'laborant@agh.edu.pl',
    role: 'user' as const,
    isActive: true,
  },
];

const groups = [
  { id: 1, name: 'Laboratorium elektroniki' },
  { id: 2, name: 'Zespół aparatury pomiarowej' },
];

const items = [
  {
    id: 1,
    systemId: 'ITEM-AGH-0001',
    name: 'Oscyloskop Tektronix TBS1102',
    manufacturer: 'Tektronix',
    description: 'Oscyloskop laboratoryjny 100MHz',
    purchaseDate: '2024-03-15',
    categoryId: 3,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 2,
    systemId: 'ITEM-AGH-0002',
    name: 'Multimetr UNI-T UT61E',
    manufacturer: 'UNI-T',
    description: 'Cyfrowy multimetr laboratoryjny',
    purchaseDate: '2023-11-08',
    categoryId: 2,
    statusId: 2,
    locationId: 2,
    ownerId: 2,
  },
  {
    id: 3,
    systemId: 'ITEM-AGH-0003',
    name: 'Analizator widma Rigol',
    manufacturer: 'Rigol',
    description: 'Analizator do ćwiczeń laboratoryjnych',
    purchaseDate: '2025-01-10',
    categoryId: 2,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 4,
    systemId: 'ITEM-AGH-0004',
    name: 'Kamera termowizyjna FLIR',
    manufacturer: 'FLIR',
    description: 'Kamera do diagnostyki układów',
    purchaseDate: '2025-02-12',
    categoryId: 2,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 5,
    systemId: 'ITEM-AGH-0005',
    name: 'Zasilacz laboratoryjny Korad',
    manufacturer: 'Korad',
    description: 'Zasilacz programowalny',
    purchaseDate: '2025-03-14',
    categoryId: 2,
    statusId: 1,
    locationId: 1,
    ownerId: 2,
  },
  {
    id: 6,
    systemId: 'ITEM-AGH-0006',
    name: 'Czujnik temperatury Pt100',
    manufacturer: 'AGH',
    description: 'Czujnik do stanowisk studenckich',
    purchaseDate: '2025-04-16',
    categoryId: 2,
    statusId: 2,
    locationId: 2,
    ownerId: 2,
  },
];

const borrowings = [
  {
    id: 1,
    itemId: 1,
    borrowerId: 2,
    externalBorrower: null,
    mode: 'classic',
    status: 'pending',
    plannedReturnAt: '2026-06-16T12:00:00.000Z',
    approvedAt: null,
    handedOverAt: null,
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-06-01T07:30:00.000Z',
  },
  {
    id: 2,
    itemId: 2,
    borrowerId: 1,
    externalBorrower: null,
    mode: 'trusted',
    status: 'borrowed',
    plannedReturnAt: '2026-05-01T12:00:00.000Z',
    approvedAt: '2026-04-01T08:00:00.000Z',
    handedOverAt: '2026-04-01T09:00:00.000Z',
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-04-01T07:30:00.000Z',
  },
  {
    id: 3,
    itemId: 1,
    borrowerId: 1,
    externalBorrower: null,
    mode: 'asynchronous',
    status: 'reserved',
    plannedReturnAt: '2026-07-01T12:00:00.000Z',
    approvedAt: '2026-06-01T08:00:00.000Z',
    handedOverAt: null,
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-06-01T07:30:00.000Z',
  },
];

test.beforeEach(async ({ page }) => {
  await mockApi(page);
  await page.addInitScript((sessionUser) => {
    window.localStorage.setItem('access_token', 'e2e-token');
    window.localStorage.setItem('auth_user', JSON.stringify(sessionUser));
  }, user);
});

test('US role i dostęp: niezalogowany użytkownik nie widzi zasobów, rejestracja tworzy konto, a mock SSO nadaje rolę', async ({
  page,
}) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/items');

  await expect(page.getByText('Wymagane logowanie')).toBeVisible();
  await page.getByRole('link', { name: /Przejdź do logowania/ }).click();
  await expect(
    page.getByText('Logowanie do systemu aparatury pomiarowej')
  ).toBeVisible();

  await page.locator('#register-email').fill('nowy.pracownik@agh.edu.pl');
  await page.locator('#register-password').fill('bezpieczne-haslo');
  await page.getByRole('button', { name: 'Zarejestruj' }).click();
  await expect(
    page.getByText('Konto wymaga zatwierdzenia przez administratora.')
  ).toBeVisible();

  await page.locator('#dev-email').fill('admin@agh.edu.pl');
  await page.getByRole('button', { name: 'Zaloguj (dev bypass)' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.locator('.sidebar-user-name')).toHaveText(
    'admin@agh.edu.pl'
  );
  await expect(page.locator('.sidebar-user-role')).toHaveText('Administrator');
});

test('US użytkownicy: administrator dezaktywuje aktywne konto', async ({
  page,
}) => {
  await page.goto('/users');

  const userRow = page.getByRole('row', {
    name: /nowy\.pracownik@agh\.edu\.pl/,
  });
  await expect(userRow).toBeVisible();
  await expect(userRow.getByText('Aktywny')).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await userRow.getByRole('button', { name: 'Dezaktywuj' }).click();

  await expect(userRow.getByText('Nieaktywny')).toBeVisible();
});

test('US-01 kategorie i statusy: drzewo, CRUD kategorii oraz własne i bazowe statusy', async ({
  page,
}) => {
  await page.goto('/categories');

  await expect(page.getByText('Urządzenia')).toBeVisible();
  await page.getByTitle('Rozwiń').click();
  await expect(page.getByText('Pomiarowe', { exact: true })).toBeVisible();
  await page.getByTitle('Rozwiń').click();
  await expect(page.getByText('Oscyloskopy')).toBeVisible();

  await page.getByRole('button', { name: '+ Nowa kategoria główna' }).click();
  await page.getByPlaceholder('Wprowadź nazwę kategorii').fill('Kable');
  await page.getByPlaceholder('Opcjonalny opis kategorii').fill('Akcesoria');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByText('Kable')).toBeVisible();

  await page.goto('/statuses');
  for (const name of [
    'Dostępny',
    'Wypożyczony',
    'Zarezerwowany',
    'Uszkodzony',
    'Oczekuje zatwierdzenia',
    'Zaginiony',
  ]) {
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: '+ Dodaj flagę' }).click();
  await page.getByPlaceholder('np. Do utylizacji').fill('W kalibracji');
  await page.locator('.modal').getByRole('button', { name: 'Utwórz' }).click();
  await expect(page.getByText('W kalibracji')).toBeVisible();

  await page.goto('/categories');
  await page.getByRole('button', { name: 'Edytuj' }).first().click();
  await page.locator('#cat-name').fill('Urządzenia laboratoryjne');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Urządzenia laboratoryjne')).toBeVisible();

  await page.getByRole('button', { name: 'Usuń' }).first().click();
  await page
    .getByRole('button', { name: 'Usuń kategorię i jej podkategorie' })
    .click();
  await expect(page.getByText('Urządzenia laboratoryjne')).toHaveCount(0);
});

test('US-02/03/05 przedmioty: dodawanie, identyfikacja, klasyfikacja, mapa lokalizacji i zdjęcia', async ({
  page,
}) => {
  await page.goto('/items');

  await expect(
    page.getByRole('cell', { name: 'Oscyloskop Tektronix TBS1102' })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Tektronix' }).first()
  ).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Oscyloskopy' })).toBeVisible();
  await page.getByRole('row', { name: /Oscyloskop Tektronix/ }).click();
  await expect(page.getByLabel('Mapa lokalizacji przedmiotu')).toContainText(
    'D-17 / 101 / Szafa A / Półka 2'
  );

  await page.getByLabel('Zmień lokalizację').selectOption('2');
  await expect(
    page.getByText('Lokalizacja przedmiotu została zaktualizowana.')
  ).toBeVisible();
  await expect(page.getByLabel('Mapa lokalizacji przedmiotu')).toContainText(
    'Delegacja CERN'
  );

  await page.getByLabel('Zmień lokalizację').selectOption('1');
  await expect(
    page.getByText('Lokalizacja przedmiotu została zaktualizowana.')
  ).toBeVisible();
  await page.getByLabel('Nowy punkt na mapie').fill('D-17 / 102 / Szafa B');
  await page.getByLabel('Budynek').fill('D-17');
  await page.getByLabel('Pokój').fill('102');
  await page.getByLabel('Szafa').fill('Szafa B');
  await page.getByLabel('Półka').fill('Półka 1');
  await page.getByLabel('mapX').fill('72');
  await page.getByLabel('mapY').fill('64');
  await page.getByRole('button', { name: 'Dodaj punkt i przypisz' }).click();
  await expect(
    page.getByText('Nowy punkt lokalizacji został dodany i przypisany.')
  ).toBeVisible();
  await expect(page.getByLabel('Mapa lokalizacji przedmiotu')).toContainText(
    'D-17 / 102 / Szafa B'
  );

  await expect(page.getByText(/Strona 1 z 2/)).toBeVisible();
  await page.getByRole('button', { name: 'Następna' }).click();
  await expect(
    page.getByRole('cell', { name: 'Zasilacz laboratoryjny Korad' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Poprzednia' }).click();

  await page.getByRole('button', { name: /Producent/ }).click();
  await expect(
    page.getByRole('cell', { name: 'AGH', exact: true })
  ).toBeVisible();

  await page.getByLabel('Producent').fill('Tektronix');
  await expect(
    page.getByRole('cell', { name: 'Oscyloskop Tektronix TBS1102' })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Multimetr UNI-T UT61E' })
  ).toHaveCount(0);

  await page.getByLabel('Producent').fill('');
  await page.getByLabel('Status').selectOption('2');
  await expect(
    page.getByRole('cell', { name: 'Wypożyczony' }).first()
  ).toBeVisible();
  await page.getByLabel('Status').selectOption('');

  await page.getByRole('button', { name: '+ Dodaj przedmiot' }).click();
  const itemModal = page.locator('.modal');
  await itemModal
    .getByPlaceholder('np. Oscyloskop Tektronix')
    .fill('Generator funkcyjny');
  await itemModal.getByPlaceholder('np. Tektronix').fill('Rigol');
  await itemModal
    .getByPlaceholder('Opcjonalny opis')
    .fill('Generator do zajęć');
  await page.locator('.modal input[name="ownerType"][value="group"]').check();
  await page
    .locator('.modal')
    .getByRole('button', { name: 'Utwórz' })
    .evaluate((button) => (button as HTMLButtonElement).click());

  await expect(
    page.getByText('Przedmiot został dodany pomyślnie.')
  ).toBeVisible();
  await expect(page.getByText('Generator funkcyjny')).toBeVisible();
  await expect(page.getByText('Grupa: Laboratorium elektroniki')).toBeVisible();

  await page.getByRole('row', { name: /Generator funkcyjny/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Usuń przedmiot' }).click();
  await expect(page.getByText('Przedmiot został usunięty.')).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Generator funkcyjny' })
  ).toHaveCount(0);

  const upload = page.locator('input[type="file"]');
  await upload.setInputFiles({
    name: 'stan-techniczny.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake image'),
  });
  await expect(page.getByText('stan-techniczny.png')).toBeVisible();
});

test('US-03/04 QR: skan pokazuje szczegóły, lokalizację i szybką zmianę statusu na uszkodzony', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto('/qr');

  await page.getByLabel('Kod QR').fill('ITEM-AGH-0001');
  await page.getByRole('button', { name: 'Sprawdź' }).click();

  await expect(page.getByText('Oscyloskop Tektronix TBS1102')).toBeVisible();
  await expect(page.getByText('D-17 / 101 / Szafa A / Półka 2')).toBeVisible();
  await expect(page.getByText('Dostępny')).toBeVisible();

  await page.getByRole('button', { name: 'Oznacz jako uszkodzony' }).click();
  await expect(page.getByText('Uszkodzony', { exact: true })).toBeVisible();

  await page.getByLabel('Kod QR').fill('LEGACY-AGH-42');
  await page.getByRole('button', { name: 'Sprawdź' }).click();
  await expect(page.getByText('Multimetr UNI-T UT61E')).toBeVisible();
  await expect(page.getByText('Delegacja CERN')).toBeVisible();

  await page.getByRole('button', { name: 'Skanuj kamerą' }).click();
  await expect(
    page.getByText(
      'Ta przeglądarka nie udostępnia skanowania kodów QR. Wpisz System ID ręcznie albo wczytaj obraz etykiety.'
    )
  ).toBeVisible();
});

test('US wypożyczenia: klasyczne, zaufane, asynchroniczne, zewnętrzne i komentarz zwrotu', async ({
  page,
}) => {
  await page.goto('/borrowings');

  await expect(page.getByText('Klasyczne')).toBeVisible();
  await expect(page.getByText('Zaufane')).toBeVisible();
  await expect(page.getByText('Asynchroniczne')).toBeVisible();

  await page.getByRole('button', { name: 'Zatwierdź' }).click();
  await expect(
    page.getByText('Status wypożyczenia został zaktualizowany.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Wydaj' }).first().click();
  await expect(
    page.getByText('Status wypożyczenia został zaktualizowany.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Nowy wniosek' }).click();
  await page.locator('.modal select').nth(1).selectOption('asynchronous');
  await page
    .locator('.modal input[type="datetime-local"]')
    .fill('2026-07-01T12:00');
  await page.getByRole('button', { name: 'Utwórz wniosek' }).click();
  await expect(
    page.getByText('Wniosek o wypożyczenie został utworzony.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Wypożyczenie zewnętrzne' }).click();
  await page.getByPlaceholder('Nazwa osoby lub instytucji').fill('CERN');
  await page
    .locator('.modal input[type="datetime-local"]')
    .fill('2026-07-01T12:00');
  await page.getByRole('button', { name: 'Wypożycz', exact: true }).click();
  await expect(
    page.getByText('Wypożyczenie zewnętrzne zostało utworzone.')
  ).toBeVisible();

  await page.getByRole('button', { name: 'Zwrot' }).first().click();
  await page
    .getByPlaceholder('np. Bez uszkodzeń')
    .fill('Widoczne pęknięcie obudowy');
  await page.getByRole('button', { name: 'Potwierdź zwrot' }).click();
  await expect(page.getByText('Wypożyczenie zostało zwrócone.')).toBeVisible();
});

test('US delegacje: właściciel dodaje delegata z poziomem edycji lub zarządzania', async ({
  page,
}) => {
  await page.goto('/items');
  await page.getByRole('row', { name: /Oscyloskop Tektronix/ }).click();

  // Existing delegation should show email, not just ID
  await expect(
    page.getByRole('cell', { name: 'opiekun@agh.edu.pl' }).first()
  ).toBeVisible();

  await page.getByRole('button', { name: 'Dodaj delegata' }).click();

  // Type into autocomplete for user email
  await page.getByPlaceholder('Wpisz email...').fill('laborant');
  // Wait for autocomplete dropdown and select the item
  await expect(
    page.locator('.autocomplete-dropdown').getByText('laborant@agh.edu.pl')
  ).toBeVisible();
  await page
    .locator('.autocomplete-dropdown')
    .getByText('laborant@agh.edu.pl')
    .click();

  // Select permission
  await page
    .locator('section', { hasText: 'Delegacje i uprawnienia' })
    .locator('select')
    .selectOption('manage');
  await page
    .getByRole('button', { name: 'Dodaj delegację', exact: true })
    .click();

  // Should now show the email in the table
  await expect(
    page.getByRole('cell', { name: 'laborant@agh.edu.pl' }).first()
  ).toBeVisible();
  await expect(page.getByText('Zarządzanie')).toBeVisible();
});

test('US audit log: administrator widzi datę, użytkownika, rodzaj operacji oraz wartości przed i po', async ({
  page,
}) => {
  await page.goto('/audit-logs');

  await expect(
    page.getByRole('heading', { name: 'Logi audytu' })
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: /Użytkownik #1/ }).first()
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: /Przedmiot #1/ }).first()
  ).toBeVisible();

  for (const action of [
    'Utworzenie przedmiotu',
    'Zmiana statusu',
    'Dodanie zdjęcia',
    'Zmiana delegatów',
    'Zwrot przedmiotu',
  ]) {
    await expect(page.getByText(action)).toBeVisible();
  }

  await expect(page.getByText('{"status":"Dostępny"}').first()).toBeVisible();
  await expect(page.getByText('{"status":"Uszkodzony"}')).toBeVisible();
  await expect(page.getByText('{"permission":"manage"}')).toBeVisible();
});

test('US narzędzia: raporty, import, druk QR i powiadomienia', async ({
  page,
}) => {
  await page.goto('/reports/overdue');
  await expect(page.getByText('Multimetr UNI-T UT61E')).toBeVisible();
  await expect(
    page.getByText(
      'Wyświetlane są wszystkie przeterminowane wypożyczenia w systemie.'
    )
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pobierz CSV' }).click();
  await page.getByRole('button', { name: 'Pobierz PDF' }).click();

  await page.goto('/import');
  await page
    .locator('label')
    .filter({ hasText: 'manufacturer' })
    .getByRole('textbox')
    .fill('producer_column');
  await page.getByLabel('Plik .xlsx').setInputFiles({
    name: 'import.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('xlsx'),
  });
  await page.getByRole('button', { name: 'Importuj' }).click();
  await expect(page.getByText('Przetworzone wiersze')).toBeVisible();
  await expect(page.getByText('Brak kategorii w wierszu 3')).toBeVisible();

  await page.goto('/batch-qr');
  await page.getByLabel('Zaznacz wszystkie przedmioty').check();
  await expect(page.getByText('Wybrano: 6 z 6')).toBeVisible();
  await page.getByRole('combobox').selectOption('large');
  await page.getByRole('button', { name: 'Pobierz PDF' }).click();
  await expect(page.getByRole('button', { name: 'Pobierz PDF' })).toBeEnabled();

  await page.goto('/notifications');
  await expect(
    page.getByText('Kanały e-mail i push nie są dostępne.')
  ).toBeVisible();
  await page.getByLabel('Godziny przed terminem zwrotu').fill('24');
  await page.getByRole('button', { name: 'Zapisz ustawienie' }).click();
  await expect(
    page.getByText('Preferencje powiadomień zostały zapisane.')
  ).toBeVisible();
  await expect(page.getByText('borrowing_approved')).toBeVisible();
  await expect(page.getByText('return_due')).toBeVisible();
});

async function mockApi(page: Page) {
  let currentCategories = [...categories];
  let currentStatuses = [...statuses];
  let currentItems = [...items];
  let currentUsers = [...managedUsers];
  let currentLocations = [...locations];
  let currentBorrowings: Array<
    Record<string, unknown> & { id: number; status: string }
  > = [...borrowings];
  let currentDelegations: Array<{
    id: number;
    item_id: number;
    user_id: number | null;
    group_id: number | null;
    permission: string;
    user_email: string | null;
    group_name: string | null;
  }> = [
    {
      id: 1,
      item_id: 1,
      user_id: 1,
      group_id: null,
      permission: 'edit',
      user_email: 'opiekun@agh.edu.pl',
      group_name: null,
    },
  ];
  let _nextDelegationId = 2;
  let photos = [
    {
      id: 1,
      itemId: 1,
      originalFilename: 'odbior.jpg',
      contentType: 'image/jpeg',
      addedAt: '2026-06-01T10:00:00.000Z',
      uploadedById: 1,
    },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/auth/google-login' && method === 'POST') {
      const body = request.postDataJSON() as { credential: string };
      // For e2e tests, credential is plain email (dev bypass simulation)
      return json(route, {
        access_token: 'e2e-token',
        token_type: 'bearer',
        user: { ...user, email: body.credential, role: user.role },
      });
    }

    if (path === '/api/v1/auth/config' && method === 'GET') {
      return json(route, {
        devBypassAuth: true,
        googleClientId: '',
      });
    }

    if (path === '/api/v1/auth/register' && method === 'POST') {
      return json(route, {
        message: 'Konto utworzone',
      });
    }

    if (path === '/api/v1/categories/' && method === 'GET') {
      return json(route, currentCategories);
    }
    if (path === '/api/v1/categories/' && method === 'POST') {
      const body = request.postDataJSON() as {
        name: string;
        description?: string;
        parentId?: number | null;
      };
      const created = {
        id: currentCategories.length + 10,
        name: body.name,
        parent_id: body.parentId ?? null,
        description: body.description ?? '',
      };
      currentCategories = [...currentCategories, created];
      return json(route, created);
    }
    if (path.match(/\/api\/v1\/categories\/\d+$/) && method === 'PATCH') {
      const id = Number(path.split('/').at(-1));
      const body = request.postDataJSON() as {
        name?: string;
        description?: string;
      };
      const current = currentCategories.find((category) => category.id === id);
      const updated = { ...current!, ...body };
      currentCategories = currentCategories.map((category) =>
        category.id === id ? updated : category
      );
      return json(route, updated);
    }
    if (path.match(/\/api\/v1\/categories\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').at(-1));
      currentCategories = currentCategories.filter(
        (category) => category.id !== id && category.parent_id !== id
      );
      return route.fulfill({ status: 204 });
    }

    if (path === '/api/v1/item-status/' && method === 'GET') {
      return json(route, currentStatuses);
    }
    if (path === '/api/v1/item-status/' && method === 'POST') {
      const body = request.postDataJSON() as { name: string };
      const created = {
        id: currentStatuses.length + 10,
        name: body.name,
        is_system: false,
      };
      currentStatuses = [...currentStatuses, created];
      return json(route, created);
    }

    if (path === '/api/v1/items/' && method === 'GET') {
      return json(route, currentItems);
    }
    if (path === '/api/v1/items/' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentItems.length + 10,
        systemId: `ITEM-AGH-${currentItems.length + 1}`,
        ...body,
      };
      currentItems = [
        ...currentItems,
        created as (typeof currentItems)[number],
      ];
      return json(route, created);
    }
    if (path === '/api/v1/locations/' && method === 'GET') {
      return json(route, currentLocations);
    }
    if (path === '/api/v1/locations/' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentLocations.length + 10,
        ...body,
      };
      currentLocations = [
        ...currentLocations,
        created as (typeof currentLocations)[number],
      ];
      return json(route, created);
    }
    if (path.match(/\/api\/v1\/items\/\d+$/) && method === 'PATCH') {
      const itemId = Number(path.split('/').at(-1));
      const body = request.postDataJSON() as { locationId?: number };
      const locationId = body.locationId ?? 0;
      currentItems = currentItems.map((item) =>
        item.id === itemId ? { ...item, locationId } : item
      );
      return json(route, { message: 'Location updated' });
    }
    if (path.match(/\/api\/v1\/items\/\d+$/) && method === 'DELETE') {
      const itemId = Number(path.split('/').at(-1));
      currentItems = currentItems.filter((item) => item.id !== itemId);
      return route.fulfill({ status: 204 });
    }
    if (path === '/api/v1/auth/users' && method === 'GET') {
      return json(route, owners);
    }
    if (path === '/api/v1/users' && method === 'GET') {
      return json(route, currentUsers);
    }
    if (
      path.match(/\/api\/v1\/users\/\d+\/deactivate$/) &&
      method === 'PATCH'
    ) {
      const userId = Number(path.split('/').at(-2));
      currentUsers = currentUsers.map((managedUser) =>
        managedUser.id === userId
          ? { ...managedUser, isActive: false }
          : managedUser
      );
      return json(
        route,
        currentUsers.find((managedUser) => managedUser.id === userId)
      );
    }
    if (path.match(/\/api\/v1\/users\/\d+\/role$/) && method === 'PATCH') {
      const userId = Number(path.split('/').at(-2));
      const body = request.postDataJSON() as { role: 'admin' | 'user' };
      currentUsers = currentUsers.map((managedUser) =>
        managedUser.id === userId
          ? { ...managedUser, role: body.role }
          : managedUser
      );
      return json(
        route,
        currentUsers.find((managedUser) => managedUser.id === userId)
      );
    }
    if (path === '/api/v1/users/search' && method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const results = owners.filter((o) => o.email.toLowerCase().includes(q));
      return json(route, results);
    }
    if (path === '/api/v1/groups/' && method === 'GET') {
      return json(route, groups);
    }
    if (path === '/api/v1/groups/search' && method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const results = groups.filter((g) => g.name.toLowerCase().includes(q));
      return json(route, results);
    }

    if (path.match(/\/api\/v1\/items\/\d+\/photos\/?$/) && method === 'GET') {
      return json(route, photos);
    }
    if (path.match(/\/api\/v1\/items\/\d+\/photos\/?$/) && method === 'POST') {
      const created = {
        id: photos.length + 1,
        itemId: 1,
        originalFilename: 'stan-techniczny.png',
        contentType: 'image/png',
        addedAt: '2026-06-09T10:00:00.000Z',
        uploadedById: 1,
      };
      photos = [...photos, created];
      return json(route, created);
    }

    if (path === '/api/v1/qr-codes/scan/ITEM-AGH-0001') {
      return json(route, {
        id: 1,
        system_id: 'ITEM-AGH-0001',
        name: 'Oscyloskop Tektronix TBS1102',
        description: 'Oscyloskop laboratoryjny 100MHz',
        qr_data: 'ITEM-AGH-0001',
      });
    }
    if (path === '/api/v1/qr-codes/scan/LEGACY-AGH-42') {
      return json(route, {
        id: 2,
        system_id: 'ITEM-AGH-0002',
        name: 'Multimetr UNI-T UT61E',
        description: 'Cyfrowy multimetr laboratoryjny',
        qr_data: 'LEGACY-AGH-42',
      });
    }
    if (path === '/api/v1/quick-actions/1' && method === 'GET') {
      return json(route, {
        id: 1,
        name: 'Oscyloskop Tektronix TBS1102',
        location: 'D-17 / 101 / Szafa A / Półka 2',
        owner_id: 1,
        status: 'Dostępny',
        canEdit: true,
      });
    }
    if (path === '/api/v1/quick-actions/2' && method === 'GET') {
      return json(route, {
        id: 2,
        name: 'Multimetr UNI-T UT61E',
        location: 'Delegacja CERN',
        owner_id: 2,
        status: 'Wypożyczony',
        canEdit: false,
      });
    }
    if (path === '/api/v1/quick-actions/1/mark-damaged') {
      return json(route, {
        id: 1,
        name: 'Oscyloskop Tektronix TBS1102',
        location: 'D-17 / 101 / Szafa A / Półka 2',
        owner_id: 1,
        status: 'Uszkodzony',
        canEdit: true,
      });
    }

    if (path === '/api/v1/borrowings/' && method === 'GET') {
      return json(route, currentBorrowings);
    }
    if (
      path === '/api/v1/borrowings/' &&
      method === 'POST' &&
      !request.postDataJSON().externalBorrower
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentBorrowings.length + 10,
        borrowerId: 1,
        externalBorrower: null,
        status: 'pending',
        approvedAt: null,
        handedOverAt: null,
        returnedAt: null,
        returnComment: null,
        createdAt: '2026-06-09T10:00:00.000Z',
        ...body,
      };
      currentBorrowings = [created, ...currentBorrowings];
      return json(route, created);
    }
    if (
      path === '/api/v1/borrowings/' &&
      method === 'POST' &&
      request.postDataJSON().externalBorrower
    ) {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = {
        id: currentBorrowings.length + 10,
        borrowerId: null,
        mode: 'external',
        status: 'borrowed',
        approvedAt: '2026-06-09T10:00:00.000Z',
        handedOverAt: '2026-06-09T10:00:00.000Z',
        returnedAt: null,
        returnComment: null,
        createdAt: '2026-06-09T10:00:00.000Z',
        ...body,
      };
      currentBorrowings = [created, ...currentBorrowings];
      return json(route, created);
    }
    if (
      path.match(/\/api\/v1\/borrowings\/\d+\/approve/) &&
      method === 'PATCH'
    ) {
      const id = Number(path.split('/').at(-2));
      currentBorrowings = currentBorrowings.map((item) =>
        item.id === id ? { ...item, status: 'reserved' } : item
      );
      return json(
        route,
        currentBorrowings.find((item) => item.id === id)
      );
    }
    if (
      path.match(/\/api\/v1\/borrowings\/\d+\/handover/) &&
      method === 'PATCH'
    ) {
      const id = Number(path.split('/').at(-2));
      currentBorrowings = currentBorrowings.map((item) =>
        item.id === id ? { ...item, status: 'borrowed' } : item
      );
      return json(
        route,
        currentBorrowings.find((item) => item.id === id)
      );
    }
    if (path.match(/\/api\/v1\/borrowings\/\d+\/reject/)) {
      return json(route, {});
    }
    if (path.match(/\/api\/v1\/borrowings\/\d+\/return/)) {
      currentBorrowings = currentBorrowings.map((item) =>
        item.id === 2 ? { ...item, status: 'returned' } : item
      );
      return json(
        route,
        currentBorrowings.find((item) => item.id === 2)
      );
    }

    // Delegation endpoints
    if (path === '/api/v1/delegations/' && method === 'GET') {
      return json(
        route,
        currentDelegations.map((delegation) => ({
          ...delegation,
          item_name:
            currentItems.find((item) => item.id === delegation.item_id)?.name ??
            `Przedmiot #${delegation.item_id}`,
        }))
      );
    }
    if (
      path.match(/\/api\/v1\/items\/1\/delegations\/?$/) &&
      method === 'GET'
    ) {
      return json(route, currentDelegations);
    }
    if (
      path.match(/\/api\/v1\/items\/1\/delegations\/?$/) &&
      method === 'POST'
    ) {
      const body = request.postDataJSON() as {
        user_id?: number;
        group_id?: number;
        permission: string;
      };
      let userEmail: string | null = null;
      let groupName: string | null = null;
      if (body.user_id) {
        const u = owners.find((o) => o.id === body.user_id);
        if (u) userEmail = u.email;
      }
      if (body.group_id) {
        const g = groups.find((g) => g.id === body.group_id);
        if (g) groupName = g.name;
      }
      const created = {
        id: _nextDelegationId++,
        item_id: 1,
        user_id: body.user_id ?? null,
        group_id: body.group_id ?? null,
        permission: body.permission,
        user_email: userEmail,
        group_name: groupName,
      };
      currentDelegations = [...currentDelegations, created];
      return json(route, created);
    }

    if (path === '/api/v1/borrowings/overdue') {
      return json(route, [
        {
          borrowingId: 2,
          itemName: 'Multimetr UNI-T UT61E',
          borrowerId: 1,
          externalBorrower: null,
          plannedReturnAt: '2026-05-01T12:00:00.000Z',
          daysOverdue: 39,
        },
        {
          borrowingId: 4,
          itemName: 'Oscyloskop Tektronix TBS1102',
          borrowerId: 2,
          borrowerEmail: 'laborant@agh.edu.pl',
          externalBorrower: null,
          plannedReturnAt: '2026-04-01T12:00:00.000Z',
          daysOverdue: 69,
        },
      ]);
    }
    if (
      path === '/api/v1/borrowings/overdue.csv' ||
      path === '/api/v1/borrowings/overdue.pdf'
    ) {
      return route.fulfill({
        status: 200,
        contentType: path.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
        body: path.endsWith('.pdf')
          ? Buffer.from('%PDF overdue')
          : 'borrowingId,itemName\n2,Multimetr UNI-T UT61E\n',
      });
    }

    if (path === '/api/v1/excel/upload' && method === 'POST') {
      return json(route, {
        total_rows_processed: 3,
        successful_rows: 2,
        errors: [
          { row_number: 3, error_message: 'Brak kategorii w wierszu 3' },
        ],
      });
    }

    if (path === '/api/v1/batch-qr/print' && method === 'POST') {
      const body = request.postDataJSON() as { item_ids: number[] };
      return json(route, {
        items: currentItems
          .filter((item) => body.item_ids.includes(item.id))
          .map((item) => ({
            id: item.id,
            systemId: item.systemId,
            name: item.name,
          })),
      });
    }

    if (path === '/api/v1/notifications/preferences' && method === 'GET') {
      return json(route, {
        emailEnabled: false,
        pushEnabled: false,
        returnDueNoticeHours: 48,
      });
    }
    if (path === '/api/v1/notifications/preferences' && method === 'PUT') {
      return json(route, request.postDataJSON());
    }
    if (path === '/api/v1/notifications/events' && method === 'GET') {
      return json(route, [
        {
          id: 1,
          eventType: 'borrowing_approved',
          channel: 'in_app',
          payload: 'Wniosek o wypożyczenie zaakceptowany',
          scheduledAt: '2026-06-10T08:00:00.000Z',
          sentAt: '2026-06-10T08:00:00.000Z',
        },
        {
          id: 2,
          eventType: 'return_due',
          channel: 'in_app',
          payload: 'Termin zwrotu za 24 godziny',
          scheduledAt: '2026-06-15T12:00:00.000Z',
          sentAt: '2026-06-15T12:00:00.000Z',
        },
      ]);
    }

    if (path === '/api/v1/audit-logs/' && method === 'GET') {
      return json(route, [
        {
          id: 1,
          userId: 1,
          userEmail: null,
          itemId: 1,
          itemName: null,
          itemSerial: null,
          itemSystemId: null,
          action: 'ITEM_CREATED',
          oldValue: null,
          newValue: { name: 'Oscyloskop Tektronix TBS1102' },
          timestamp: '2026-06-01T08:00:00.000Z',
        },
        {
          id: 2,
          userId: 1,
          userEmail: null,
          itemId: 1,
          itemName: null,
          itemSerial: null,
          itemSystemId: null,
          action: 'STATUS_CHANGED',
          oldValue: { status: 'Dostępny' },
          newValue: { status: 'Uszkodzony' },
          timestamp: '2026-06-02T09:00:00.000Z',
        },
        {
          id: 3,
          userId: 2,
          userEmail: null,
          itemId: 1,
          itemName: null,
          itemSerial: null,
          itemSystemId: null,
          action: 'PHOTO_ADDED',
          oldValue: null,
          newValue: { filename: 'stan-techniczny.png' },
          timestamp: '2026-06-03T10:00:00.000Z',
        },
        {
          id: 4,
          userId: 1,
          userEmail: null,
          itemId: 1,
          itemName: null,
          itemSerial: null,
          itemSystemId: null,
          action: 'DELEGATES_CHANGED',
          oldValue: null,
          newValue: { permission: 'manage' },
          timestamp: '2026-06-04T11:00:00.000Z',
        },
        {
          id: 5,
          userId: 1,
          userEmail: null,
          itemId: 2,
          itemName: null,
          itemSerial: null,
          itemSystemId: null,
          action: 'BORROWING_RETURNED',
          oldValue: { status: 'Wypożyczony' },
          newValue: { status: 'Dostępny' },
          timestamp: '2026-06-05T12:00:00.000Z',
        },
      ]);
    }

    return route.fulfill({
      status: 404,
      body: `No e2e mock for ${method} ${path}`,
    });
  });
}

async function json(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
