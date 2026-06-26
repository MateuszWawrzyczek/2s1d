import type { Status } from './schema';

export const SYSTEM_STATUSES: Omit<Status, 'id' | 'description'>[] = [
  { name: 'Dostępny', isSystem: true, slug: 'dostepny' },
  { name: 'W użyciu', isSystem: true, slug: 'w-uzyciu' },
  { name: 'W naprawie', isSystem: true, slug: 'w-naprawie' },
  { name: 'Uszkodzony', isSystem: true, slug: 'uszkodzony' },
  { name: 'Wypożyczony', isSystem: true, slug: 'wypozyczony' },
  { name: 'Zarezerwowany', isSystem: true, slug: 'zarezerwowany' },
  { name: 'Zarchiwizowany', isSystem: true, slug: 'zarchiwizowany' },
  {
    name: 'Oczekuje zatwierdzenia',
    isSystem: true,
    slug: 'oczekuje-zatwierdzenia',
  },
];

export const DEFAULT_LOCATIONS = [
  {
    name: 'Magazyn główny',
    kind: 'internal' as const,
    building: 'Budynek A',
    room: '001',
  },
  {
    name: 'Sala 101',
    kind: 'internal' as const,
    building: 'Budynek A',
    room: '101',
  },
  {
    name: 'Laboratorium',
    kind: 'internal' as const,
    building: 'Budynek B',
    room: '203',
  },
  {
    name: 'Biuro',
    kind: 'internal' as const,
    building: 'Budynek A',
    room: '305',
  },
];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
