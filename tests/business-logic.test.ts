import { describe, it, expect } from 'vitest';
import { slugify, DEFAULT_LOCATIONS } from '../src/db/seed';
import { canUpdateItemField } from '../src/lib/permissions';

describe('slugify', () => {
  it('converts to lowercase and replaces spaces with hyphens', () => {
    expect(slugify('Dostępny')).toBe('dostpny');
    expect(slugify('Oczekuje zatwierdzenia')).toBe('oczekuje-zatwierdzenia');
  });

  it('removes special characters', () => {
    expect(slugify('Test!@#')).toBe('test');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('trims whitespace', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });
});

describe('item update permissions', () => {
  it('prevents edit delegates from transferring ownership', () => {
    expect(canUpdateItemField('edit', 'ownerId')).toBe(false);
    expect(canUpdateItemField('edit', 'ownerGroupId')).toBe(false);
    expect(canUpdateItemField('edit', 'statusId')).toBe(true);
    expect(canUpdateItemField('edit', 'description')).toBe(true);
  });

  it('allows managers and owners to transfer ownership', () => {
    expect(canUpdateItemField('manage', 'ownerId')).toBe(true);
    expect(canUpdateItemField('owner', 'ownerGroupId')).toBe(true);
    expect(canUpdateItemField('admin', 'ownerId')).toBe(true);
  });
});

describe('DEFAULT_LOCATIONS', () => {
  it('has at least 3 default locations', () => {
    expect(DEFAULT_LOCATIONS.length).toBeGreaterThanOrEqual(3);
  });

  it('all locations have name and kind', () => {
    for (const loc of DEFAULT_LOCATIONS) {
      expect(loc.name).toBeTruthy();
      expect(loc.kind).toBe('internal');
    }
  });
});
