import { describe, it, expect } from 'vitest';
import { statusService } from './statusService';

describe('statusService', () => {
  it('pobiera wszystkie statusy', async () => {
    const statuses = await statusService.getAll();
    expect(statuses.length).toBeGreaterThan(0);
  });

  it('zwraca 5 statusów systemowych', async () => {
    const statuses = await statusService.getAll();
    const system = statuses.filter((s) => s.type === 'system');
    expect(system.length).toBe(5);
  });

  it('tworzy nowy status własny', async () => {
    const statuses = await statusService.create({
      name: 'Testowy',
      slug: 'testowy',
    });
    expect(statuses.name).toBe('Testowy');
    expect(statuses.type).toBe('custom');
  });

  it('rzuca błąd gdy slug już istnieje', async () => {
    await expect(
      statusService.create({ name: 'Duplikat', slug: 'testowy' })
    ).rejects.toThrow('już istnieje');
  });

  it('edytuje własny status', async () => {
    const all = await statusService.getAll();
    const custom = all.find((s) => s.type === 'custom')!;
    const updated = await statusService.update(custom.id, {
      name: 'Zmieniony',
    });
    expect(updated.name).toBe('Zmieniony');
  });

  it('nie pozwala edytować statusu systemowego', async () => {
    const all = await statusService.getAll();
    const system = all.find((s) => s.type === 'system')!;
    await expect(
      statusService.update(system.id, { name: 'Hack' })
    ).rejects.toThrow('systemowych');
  });

  it('usuwa własny status', async () => {
    const before = await statusService.getAll();
    const custom = before.find((s) => s.type === 'custom')!;
    await statusService.remove(custom.id);
    const after = await statusService.getAll();
    expect(after.find((s) => s.id === custom.id)).toBeUndefined();
  });

  it('nie pozwala usunąć statusu systemowego', async () => {
    const all = await statusService.getAll();
    const system = all.find((s) => s.type === 'system')!;
    await expect(statusService.remove(system.id)).rejects.toThrow(
      'systemowych'
    );
  });
  it('rzuca błąd gdy slug zawiera niedozwolone znaki', async () => {
    await expect(
      statusService.create({ name: 'Zły slug', slug: 'Zły slug!' })
    ).rejects.toThrow('małe litery');
  });
});
