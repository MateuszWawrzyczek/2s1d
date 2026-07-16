import { expect, test, type Page, type Route } from '@playwright/test';

type Role = 'admin' | 'user';

const adminUser = {
  id: 1,
  email: 'admin@agh.edu.pl',
  role: 'admin' as Role,
  is_active: true,
};

const regularUser = {
  id: 2,
  email: 'laborant@agh.edu.pl',
  role: 'user' as Role,
  is_active: true,
};

const categories = [{ id: 1, name: 'Pomiarowe', parent_id: null }];

const statuses = [
  { id: 1, name: 'Dostępny', is_system: true },
  { id: 2, name: 'Zarezerwowany', is_system: true },
  { id: 3, name: 'Wypożyczony', is_system: true },
  { id: 4, name: 'Oczekuje zatwierdzenia', is_system: true },
];

const owners = [
  { id: 1, email: 'admin@agh.edu.pl' },
  { id: 2, email: 'laborant@agh.edu.pl' },
];

const groups = [{ id: 1, name: 'Zespół aparatury' }];

test('rejestracja pokazuje czytelny komunikat walidacji z API', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/config', (route) =>
    json(route, { devBypassAuth: false, googleClientId: '' })
  );
  await page.route('**/api/v1/auth/register', (route) =>
    json(route, { detail: 'Podaj prawidłowy adres e-mail.' }, 400)
  );

  await page.goto('/login');
  await page.locator('#register-email').fill('zly-adres@agh.edu.pl');
  await page.locator('#register-password').fill('bezpiecznehaslo');
  await page.getByRole('button', { name: 'Zarejestruj' }).click();

  await expect(page.getByText('Podaj prawidłowy adres e-mail.')).toBeVisible();
});

test('nieaktywny użytkownik ma widoczny stan braku uprawnień i brak selektora roli', async ({
  page,
}) => {
  await signIn(page, adminUser);
  await page.route('**/api/v1/users', (route) =>
    json(route, [
      { id: 1, email: 'admin@agh.edu.pl', role: 'admin', isActive: true },
      {
        id: 2,
        email: 'nowy.pracownik@agh.edu.pl',
        role: 'user',
        isActive: false,
      },
    ])
  );

  await page.goto('/users');
  const row = page.getByRole('row', { name: /nowy\.pracownik@agh\.edu\.pl/ });

  await expect(row.getByText('Brak uprawnień')).toBeVisible();
  await expect(row.getByText('Nieaktywny')).toBeVisible();
  await expect(row.locator('select')).toHaveCount(0);
});

test('użytkownik bez uprawnień nie widzi edycji przedmiotu, ale widzi daty i pustą historię zdjęć', async ({
  page,
}) => {
  await signIn(page, regularUser);
  await mockInventoryApi(page, {
    initialItems: [
      {
        id: 10,
        systemId: 'ITEM-AGH-0010',
        name: 'Oscyloskop Tektronix TBS1102',
        manufacturer: 'Tektronix',
        description: 'Oscyloskop laboratoryjny',
        purchaseDate: '2024-03-15',
        addedAt: '2026-06-28T10:00:00.000Z',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
    ],
    photos: [],
    delegations: [],
  });

  await page.goto('/items');

  await expect(page.getByText('Data dodania')).toBeVisible();
  await expect(page.getByText('28.06.2026')).toBeVisible();
  await expect(page.getByText('Data zakupu')).toBeVisible();
  await expect(page.getByText('15.03.2024')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edytuj przedmiot' })
  ).toHaveCount(0);
  await expect(
    page.getByText('Nie masz uprawnień do zmiany lokalizacji tego przedmiotu.')
  ).toBeVisible();
  await expect(page.getByText('Brak zdjęć dla tego przedmiotu.')).toBeVisible();
  await expect(page.locator('select.form-input').first()).toHaveCSS(
    'color-scheme',
    'dark'
  );
});

test('opiekun może edytować i usuwać lokalizację przedmiotu', async ({
  page,
}) => {
  await signIn(page, adminUser);
  await mockInventoryApi(page, {
    initialItems: [
      {
        id: 11,
        systemId: 'ITEM-AGH-0011',
        name: 'Generator funkcyjny Rigol',
        manufacturer: 'Rigol',
        purchaseDate: '2025-01-10',
        addedAt: '2026-06-28T10:00:00.000Z',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
    ],
  });

  await page.goto('/items');

  await page.getByRole('button', { name: 'Edytuj lokalizację' }).click();
  const editLocationGrid = page.locator('.location-controls__grid').first();
  await editLocationGrid
    .getByLabel('Nazwa lokalizacji')
    .fill('D-17 / 105 / Szafa C');
  await editLocationGrid.getByLabel('Pokój').fill('105');
  await editLocationGrid.getByLabel('mapX').fill('19.9205');
  await editLocationGrid.getByLabel('mapY').fill('50.0667');
  await page.getByRole('button', { name: 'Zapisz lokalizację' }).click();

  await expect(
    page.getByText('Lokalizacja została zaktualizowana.')
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'D-17 / 105 / Szafa C' })
  ).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Usuń lokalizację' }).click();

  await expect(page.getByText('Lokalizacja została usunięta.')).toBeVisible();
  await expect(page.getByText('Brak przypisanej lokalizacji')).toBeVisible();
});

test('wniosek o wypożyczenie filtruje tylko niedostępne i własne oczekujące pozycje', async ({
  page,
}) => {
  await signIn(page, adminUser);
  await mockInventoryApi(page, {
    initialItems: [
      {
        id: 21,
        systemId: 'ITEM-AGH-0021',
        name: 'Własny oczekujący',
        manufacturer: 'AGH',
        categoryId: 1,
        statusId: 4,
        locationId: 1,
        ownerId: 1,
      },
      {
        id: 22,
        systemId: 'ITEM-AGH-0022',
        name: 'Cudzy oczekujący',
        manufacturer: 'AGH',
        categoryId: 1,
        statusId: 4,
        locationId: 1,
        ownerId: 1,
      },
      {
        id: 23,
        systemId: 'ITEM-AGH-0023',
        name: 'Już wypożyczony',
        manufacturer: 'AGH',
        categoryId: 1,
        statusId: 3,
        locationId: 1,
        ownerId: 1,
      },
    ],
    borrowings: [
      borrowing({ id: 1, itemId: 21, borrowerId: 1, status: 'pending' }),
      borrowing({ id: 2, itemId: 22, borrowerId: 2, status: 'pending' }),
      borrowing({ id: 3, itemId: 23, borrowerId: 2, status: 'borrowed' }),
    ],
  });

  await page.goto('/borrowings');
  await page.getByRole('button', { name: 'Nowy wniosek' }).click();

  const itemSelect = page.locator('.modal select').first();
  await expect(
    itemSelect.locator('option', { hasText: 'Własny oczekujący' })
  ).toHaveCount(0);
  await expect(
    itemSelect.locator('option', { hasText: 'Cudzy oczekujący' })
  ).toHaveCount(1);
  await expect(
    itemSelect.locator('option', { hasText: 'Już wypożyczony' })
  ).toHaveCount(0);
});

test('zatwierdzenie wypożyczenia aktualizuje status przedmiotu widoczny w module przedmiotów', async ({
  page,
}) => {
  await signIn(page, adminUser);
  await mockInventoryApi(page, {
    initialItems: [
      {
        id: 31,
        systemId: 'ITEM-AGH-0031',
        name: 'Analizator widma Rigol',
        manufacturer: 'Rigol',
        categoryId: 1,
        statusId: 4,
        locationId: 1,
        ownerId: 1,
      },
    ],
    borrowings: [
      borrowing({ id: 31, itemId: 31, borrowerId: 2, status: 'pending' }),
    ],
  });

  await page.goto('/borrowings');
  await page.getByRole('button', { name: 'Zatwierdź' }).click();
  await expect(
    page.getByText('Status wypożyczenia został zaktualizowany.')
  ).toBeVisible();

  await page.goto('/items');
  await expect(
    page.getByRole('row', { name: /Analizator widma Rigol.*Zarezerwowany/ })
  ).toBeVisible();
});

test('skaner QR pokazuje fallback, gdy przeglądarka nie udostępnia skanowania kamerą', async ({
  page,
}) => {
  await signIn(page, adminUser);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
  });

  await page.goto('/qr');
  await page.getByRole('button', { name: 'Skanuj kamerą' }).click();

  await expect(
    page.getByText(
      'Ta przeglądarka nie udostępnia skanowania kodów QR. Wpisz System ID ręcznie albo wczytaj obraz etykiety.'
    )
  ).toBeVisible();
});

test('import CSV/XLSX pokazuje szczegółowy błąd referencji z wiersza', async ({
  page,
}) => {
  await signIn(page, adminUser);
  await page.route('**/api/v1/excel/upload', (route) =>
    json(route, {
      total_rows_processed: 1,
      successful_rows: 0,
      errors: [
        {
          row_number: 3,
          error_message: 'Wiersz 3: owner_id=999 nie istnieje',
        },
      ],
    })
  );

  await page.goto('/import');
  await page.getByLabel('Plik .xlsx').setInputFiles({
    name: 'aparatura.xlsx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('xlsx'),
  });
  await page.getByRole('button', { name: 'Importuj' }).click();

  await expect(
    page.getByText('Wiersz 3: owner_id=999 nie istnieje')
  ).toBeVisible();
});

test('powiadomienia zachowują układ bez poziomego przewijania na wąskim ekranie', async ({
  page,
}) => {
  await signIn(page, regularUser);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route('**/api/v1/notifications/preferences', (route) =>
    json(route, {
      emailEnabled: false,
      pushEnabled: false,
      returnDueNoticeHours: 24,
    })
  );
  await page.route('**/api/v1/notifications/events', (route) =>
    json(route, [
      {
        id: 1,
        eventType: 'borrowing_approved',
        channel: 'in_app',
        payload: 'Wniosek zaakceptowany',
        scheduledAt: '2026-06-28T10:00:00.000Z',
        sentAt: '2026-06-28T10:00:00.000Z',
      },
    ])
  );

  await page.goto('/notifications');
  await expect(
    page.getByText('Kanały e-mail i push nie są dostępne.')
  ).toBeVisible();
  await expect(page.locator('.table-wrap--scroll')).toBeVisible();

  const hasPageOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
  );
  expect(hasPageOverflow).toBe(false);
});

test('druk QR umożliwia pobranie osobnych plików PNG dla zaznaczonych przedmiotów', async ({
  page,
}) => {
  await signIn(page, adminUser);
  let batchRequest: { item_ids: number[] } | null = null;
  await mockInventoryApi(page, {
    initialItems: [
      {
        id: 41,
        systemId: 'ITEM-AGH-0041',
        name: 'Kamera termowizyjna FLIR',
        manufacturer: 'FLIR',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
    ],
    onBatchQr: (body) => {
      batchRequest = body;
    },
  });

  await page.goto('/batch-qr');
  await page.getByLabel('Wybierz Kamera termowizyjna FLIR').check();
  await page.getByRole('button', { name: 'Pobierz PNG osobno' }).click();

  await expect.poll(() => batchRequest?.item_ids.join(',')).toBe('41');
});

async function signIn(
  page: Page,
  user: { id: number; email: string; role: Role; is_active: boolean }
) {
  await page.addInitScript((sessionUser) => {
    window.localStorage.setItem('access_token', 'e2e-token');
    window.localStorage.setItem('auth_user', JSON.stringify(sessionUser));
  }, user);
}

function borrowing({
  id,
  itemId,
  borrowerId,
  status,
}: {
  id: number;
  itemId: number;
  borrowerId: number;
  status: 'pending' | 'reserved' | 'borrowed';
}) {
  return {
    id,
    itemId,
    borrowerId,
    externalBorrower: null,
    mode: 'classic',
    status,
    plannedReturnAt: '2026-07-01T12:00:00.000Z',
    approvedAt: status === 'pending' ? null : '2026-06-28T10:00:00.000Z',
    handedOverAt: status === 'borrowed' ? '2026-06-28T10:30:00.000Z' : null,
    returnedAt: null,
    returnComment: null,
    createdAt: '2026-06-28T09:00:00.000Z',
  };
}

async function mockInventoryApi(
  page: Page,
  options: {
    initialItems: Array<Record<string, unknown> & { id: number; name: string }>;
    photos?: unknown[];
    delegations?: unknown[];
    borrowings?: Array<
      Record<string, unknown> & { id: number; itemId: number }
    >;
    onBatchQr?: (body: { item_ids: number[] }) => void;
  }
) {
  let items = [...options.initialItems];
  let locations = [
    {
      id: 1,
      name: 'D-17 / 101 / Szafa A',
      kind: 'internal',
      building: 'D-17',
      room: '101',
      cabinet: 'Szafa A',
      shelf: 'Półka 1',
      mapX: 19.9201,
      mapY: 50.0661,
    },
  ];
  let activeBorrowings = [...(options.borrowings ?? [])];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/items/' && method === 'GET')
      return json(route, items);
    if (path === '/api/v1/categories/' && method === 'GET')
      return json(route, categories);
    if (path === '/api/v1/item-status/' && method === 'GET')
      return json(route, statuses);
    if (path === '/api/v1/locations/' && method === 'GET')
      return json(route, locations);
    if (path === '/api/v1/auth/users' && method === 'GET')
      return json(route, owners);
    if (path === '/api/v1/groups/' && method === 'GET')
      return json(route, groups);
    if (path.match(/\/api\/v1\/items\/\d+\/photos\/?$/) && method === 'GET')
      return json(route, options.photos ?? []);
    if (
      path.match(/\/api\/v1\/items\/\d+\/delegations\/?$/) &&
      method === 'GET'
    )
      return json(route, options.delegations ?? []);

    if (path.match(/\/api\/v1\/locations\/\d+$/) && method === 'PATCH') {
      const id = Number(path.split('/').at(-1));
      const body = request.postDataJSON() as Record<string, unknown>;
      locations = locations.map((location) =>
        location.id === id ? { ...location, ...body } : location
      );
      return json(
        route,
        locations.find((location) => location.id === id)
      );
    }
    if (path.match(/\/api\/v1\/locations\/\d+$/) && method === 'DELETE') {
      const id = Number(path.split('/').at(-1));
      locations = locations.filter((location) => location.id !== id);
      items = items.map((item) =>
        item.locationId === id ? { ...item, locationId: 0 } : item
      );
      return route.fulfill({ status: 204 });
    }
    if (path.match(/\/api\/v1\/items\/\d+$/) && method === 'PATCH') {
      const itemId = Number(path.split('/').at(-1));
      const body = request.postDataJSON() as Record<string, unknown>;
      items = items.map((item) =>
        item.id === itemId ? { ...item, ...body } : item
      );
      return json(
        route,
        items.find((item) => item.id === itemId)
      );
    }

    if (path === '/api/v1/borrowings/' && method === 'GET') {
      return json(route, activeBorrowings);
    }
    if (
      path.match(/\/api\/v1\/borrowings\/\d+\/approve$/) &&
      method === 'PATCH'
    ) {
      const id = Number(path.split('/').at(-2));
      activeBorrowings = activeBorrowings.map((entry) =>
        entry.id === id ? { ...entry, status: 'reserved' } : entry
      );
      const borrowingEntry = activeBorrowings.find((entry) => entry.id === id);
      if (borrowingEntry) {
        items = items.map((item) =>
          item.id === borrowingEntry.itemId ? { ...item, statusId: 2 } : item
        );
      }
      return json(route, borrowingEntry);
    }

    if (path === '/api/v1/batch-qr/print' && method === 'POST') {
      const body = request.postDataJSON() as { item_ids: number[] };
      options.onBatchQr?.(body);
      return json(route, {
        items: items
          .filter((item) => body.item_ids.includes(item.id))
          .map((item) => ({
            id: item.id,
            systemId: item.systemId ?? null,
            name: item.name,
          })),
      });
    }

    return route.fulfill({
      status: 404,
      body: `No e2e mock for ${method} ${path}`,
    });
  });
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
