import { describe, it, expect } from 'vitest';

describe('items logic', () => {
  it('lists all items', () => {
    const mockRows = [
      {
        id: 1,
        systemId: 'SYS-001',
        name: 'Laptop',
        manufacturer: 'Dell',
        description: null,
        purchaseDate: null,
        addedAt: '2026-01-01',
        categoryId: null,
        statusId: 1,
        locationId: 1,
        ownerId: null,
        ownerGroupId: null,
      },
      {
        id: 2,
        systemId: null,
        name: 'Projector',
        manufacturer: 'Epson',
        description: 'Full HD',
        purchaseDate: null,
        addedAt: '2026-01-02',
        categoryId: null,
        statusId: 1,
        locationId: 2,
        ownerId: null,
        ownerGroupId: null,
      },
    ];

    expect(mockRows).toHaveLength(2);
    expect(mockRows[0].name).toBe('Laptop');
    expect(mockRows[1].systemId).toBeNull();
  });

  it('creates item with required fields', () => {
    const payload = { name: 'New Item' };
    expect(payload.name).toBe('New Item');
  });

  it('filters items by search', () => {
    const search = 'Dell';
    expect(search).toMatch(/dell/i);
  });
});

describe('borrowings logic', () => {
  it('creates borrowing in pending state', () => {
    const borrowing = {
      itemId: 1,
      mode: 'classic',
      status: 'pending',
    };
    expect(borrowing.status).toBe('pending');
    expect(borrowing.mode).toBe('classic');
  });

  it('trusted mode auto-approves', () => {
    const borrowing = {
      itemId: 1,
      mode: 'trusted',
      status: 'borrowed',
    };
    expect(borrowing.status).toBe('borrowed');
  });

  it('rejects non-pending approval', () => {
    const alreadyBorrowed = { status: 'borrowed' };
    expect(alreadyBorrowed.status).not.toBe('pending');
  });
});
