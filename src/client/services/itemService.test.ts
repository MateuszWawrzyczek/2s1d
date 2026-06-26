import { describe, expect, it } from 'vitest';

import { itemService } from './itemService';

describe('itemService', () => {
  it('usuwa przedmiot z mockowanej listy', async () => {
    await itemService.remove(1);

    const items = await itemService.getAll();

    expect(items.find((item) => item.id === 1)).toBeUndefined();
    expect(items.find((item) => item.id === 2)).toBeDefined();
  });
});
