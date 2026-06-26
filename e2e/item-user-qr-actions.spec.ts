import { expect, test, type Page, type Route } from '@playwright/test';

const sessionUser = {
  id: 1,
  email: 'admin@agh.edu.pl',
  role: 'admin',
  is_active: true,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((user) => {
    window.localStorage.setItem('access_token', 'e2e-token');
    window.localStorage.setItem('auth_user', JSON.stringify(user));
  }, sessionUser);
});

test('administrator usuwa przedmiot bez historii wypożyczeń', async ({
  page,
}) => {
  let items = [
    {
      id: 10,
      systemId: 'ITEM-AGH-0010',
      name: 'Generator funkcyjny Rigol',
      manufacturer: 'Rigol',
      description: 'Generator do zajęć',
      categoryId: 1,
      statusId: 1,
      locationId: 1,
      ownerId: 1,
    },
  ];

  await mockCommonApi(page, {
    getItems: () => items,
    deleteItem: (id) => {
      items = items.filter((item) => item.id !== id);
    },
  });

  await page.goto('/items');
  await page.getByRole('row', { name: /Generator funkcyjny Rigol/ }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Usuń przedmiot' }).click();

  await expect(page.getByText('Przedmiot został usunięty.')).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Generator funkcyjny Rigol' })
  ).toHaveCount(0);
});

test('druk QR zaznacza wszystkie pozycje jednym przełącznikiem', async ({
  page,
}) => {
  await mockCommonApi(page, {
    getItems: () => [
      {
        id: 1,
        systemId: 'ITEM-AGH-0001',
        name: 'Oscyloskop Tektronix TBS1102',
        manufacturer: 'Tektronix',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
      {
        id: 2,
        systemId: 'ITEM-AGH-0002',
        name: 'Multimetr UNI-T UT61E',
        manufacturer: 'UNI-T',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
    ],
  });

  await page.goto('/batch-qr');
  await page.getByLabel('Zaznacz wszystkie przedmioty').check();

  await expect(page.getByText('Wybrano: 2 z 2')).toBeVisible();
  await expect(
    page
      .getByRole('row', { name: /Oscyloskop Tektronix/ })
      .getByRole('checkbox')
  ).toBeChecked();
  await expect(
    page.getByRole('row', { name: /Multimetr UNI-T/ }).getByRole('checkbox')
  ).toBeChecked();
});

test('administrator dezaktywuje aktywne konto', async ({ page }) => {
  let users = [
    {
      id: 1,
      email: 'admin@agh.edu.pl',
      role: 'admin',
      isActive: true,
    },
    {
      id: 2,
      email: 'nowy.pracownik@agh.edu.pl',
      role: 'user',
      isActive: true,
    },
  ];

  await mockCommonApi(page, {
    getUsers: () => users,
    deactivateUser: (id) => {
      users = users.map((user) =>
        user.id === id ? { ...user, isActive: false } : user
      );
      return users.find((user) => user.id === id);
    },
  });

  await page.goto('/users');
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('row', { name: /nowy\.pracownik@agh\.edu\.pl/ })
    .getByRole('button', { name: 'Dezaktywuj' })
    .click();

  await expect(
    page
      .getByRole('row', { name: /nowy\.pracownik@agh\.edu\.pl/ })
      .getByText('Nieaktywny')
  ).toBeVisible();
});

async function mockCommonApi(
  page: Page,
  options: {
    getItems?: () => unknown[];
    deleteItem?: (id: number) => void;
    getUsers?: () => unknown[];
    deactivateUser?: (id: number) => unknown;
  }
) {
  const categories = [{ id: 1, name: 'Pomiarowe', parent_id: null }];
  const statuses = [{ id: 1, name: 'Dostępny', is_system: true }];
  const locations = [
    {
      id: 1,
      name: 'D-17 / 101',
      kind: 'internal',
      building: 'D-17',
      room: '101',
    },
  ];
  const owners = [{ id: 1, email: 'admin@agh.edu.pl' }];
  const groups: unknown[] = [];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/v1/items/' && method === 'GET')
      return json(route, options.getItems?.() ?? []);
    if (path.match(/\/api\/v1\/items\/\d+$/) && method === 'DELETE') {
      options.deleteItem?.(Number(path.split('/').at(-1)));
      return route.fulfill({ status: 204 });
    }
    if (path.match(/\/api\/v1\/items\/\d+\/photos$/) && method === 'GET')
      return json(route, []);
    if (path.match(/\/api\/v1\/items\/\d+\/delegations$/) && method === 'GET')
      return json(route, []);
    if (path === '/api/v1/batch-qr/print' && method === 'POST') {
      const body = request.postDataJSON() as { item_ids: number[] };
      return json(route, {
        items: (options.getItems?.() ?? []).filter((item) =>
          body.item_ids.includes((item as { id: number }).id)
        ),
      });
    }
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
    if (path === '/api/v1/users' && method === 'GET')
      return json(route, options.getUsers?.() ?? []);
    if (
      path.match(/\/api\/v1\/users\/\d+\/deactivate$/) &&
      method === 'PATCH'
    ) {
      return json(
        route,
        options.deactivateUser?.(Number(path.split('/').at(-2)))
      );
    }

    return route.fulfill({
      status: 404,
      body: `No mock for ${method} ${path}`,
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
