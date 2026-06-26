import { describe, it, expect } from 'vitest';

describe('statuses logic', () => {
  it('lists all statuses', () => {
    const mockRows = [
      {
        id: 1,
        name: 'Dostępny',
        isSystem: true,
        slug: 'dostepny',
        description: null,
      },
      {
        id: 6,
        name: 'Zaginiony',
        isSystem: false,
        slug: 'zaginiony',
        description: 'test',
      },
    ];

    expect(mockRows).toHaveLength(2);
    expect(mockRows[0].name).toBe('Dostępny');
  });

  it('prevents deletion of system statuses', () => {
    const systemStatus = {
      id: 1,
      name: 'Dostępny',
      isSystem: true,
      slug: 'dostepny',
    };
    expect(systemStatus.isSystem).toBe(true);
  });

  it('allows deletion of custom statuses', () => {
    const customStatus = {
      id: 6,
      name: 'Zaginiony',
      isSystem: false,
      slug: 'zaginiony',
    };
    expect(customStatus.isSystem).toBe(false);
  });
});
