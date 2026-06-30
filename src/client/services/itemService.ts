import type { Category } from '../types/category';
import type { Group } from '../types/group';
import type { CreateItemPayload, Item } from '../types/item';
import type { Location } from '../types/location';
import type { Owner } from '../types/owner';
import type { Status } from '../types/status';
import { ensureOk } from './apiError';
import { authHeaders, jsonAuthHeaders } from './authHeaders';

const USE_MOCKS = import.meta.env.MODE === 'test';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface CreateLocationPayload {
  name: string;
  kind: 'internal' | 'external';
  building?: string;
  room?: string;
  cabinet?: string;
  shelf?: string;
  mapX?: number;
  mapY?: number;
}

export type UpdateLocationPayload = Partial<CreateLocationPayload>;

interface BackendItem {
  id: number;
  systemId?: string | null;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  serial?: string | null;
  inventoryNumber?: string | null;
  description?: string | null;
  purchaseDate?: string | null;
  addedAt?: string | null;
  categoryId?: number | null;
  statusId?: number | null;
  locationId?: number | null;
  ownerId?: number | null;
  owner_id?: number | null;
  ownerGroupId?: number | null;
  legacyItemId?: number | null;
}
interface BackendCat {
  id: number;
  name: string;
  parent_id?: number | null;
}
interface BackendLocation {
  id: number;
  name: string;
  kind?: 'internal' | 'external';
  building?: string | null;
  room?: string | null;
  cabinet?: string | null;
  shelf?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}
interface BackendGroup {
  id: number;
  name: string;
}

let mockItems: Item[] = [
  {
    id: 1,
    name: 'Oscyloskop Tektronix TBS1102',
    manufacturer: 'Tektronix',
    model: 'TBS1102',
    serial: 'SER001',
    inventoryNumber: 'INV-2024-001',
    description: 'Oscyloskop laboratoryjny 100MHz',
    purchaseDate: '2024-03-15',
    categoryId: 1,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
  {
    id: 2,
    name: 'Multimetr UNI-T UT61E',
    manufacturer: 'UNI-T',
    model: 'UT61E',
    serial: 'SER002',
    inventoryNumber: 'INV-2023-045',
    description: 'Cyfrowy multimetr laboratoryjny',
    purchaseDate: '2023-11-08',
    categoryId: 2,
    statusId: 2,
    locationId: 2,
    ownerId: 2,
  },
];
let nextId = 3;

const mockCategories: Category[] = [
  { id: 1, name: 'Oscyloskop', parentId: null },
  { id: 2, name: 'Multimetr', parentId: null },
];
const mockGroups: Group[] = [{ id: 1, name: 'Laboratorium Fizyki' }];
const mockLocations: Location[] = [
  {
    id: 1,
    name: 'Magazyn A',
    kind: 'internal',
    building: 'D-17',
    mapX: 28,
    mapY: 42,
  },
  {
    id: 2,
    name: 'Sala 101',
    kind: 'internal',
    building: 'D-17',
    room: '101',
    mapX: 68,
    mapY: 30,
  },
];
const mockOwners: Owner[] = [
  { id: 1, fullName: 'jan.kowalski@agh.edu.pl' },
  { id: 2, fullName: 'anna.nowak@agh.edu.pl' },
];
const mockStatuses: Status[] = [
  { id: 1, name: 'Dostępny', slug: 'dostpny', type: 'system' },
  { id: 2, name: 'Wypożyczony', slug: 'wypoyczony', type: 'system' },
];

export const itemService = {
  async getAll(): Promise<Item[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockItems];
    }
    const r = await fetch('/api/v1/items/', { headers: authHeaders() });
    await ensureOk(r);
    return ((await r.json()) as BackendItem[]).map(mapItem);
  },
  async create(payload: CreateItemPayload): Promise<Item> {
    if (USE_MOCKS) {
      await delay(500);
      const i: Item = {
        id: nextId++,
        name: payload.name,
        manufacturer: payload.manufacturer || '',
        model: payload.model,
        serial: payload.serial,
        inventoryNumber: payload.inventoryNumber,
        description: payload.description,
        purchaseDate: payload.purchaseDate,
        categoryId: payload.categoryId ?? 0,
        statusId: payload.statusId ?? 0,
        locationId: payload.locationId ?? 0,
        ownerId: payload.ownerId ?? 0,
        ownerGroupId: payload.ownerGroupId,
      };
      mockItems = [...mockItems, i];
      return i;
    }
    const r = await fetch('/api/v1/items/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(r);
    return mapItem(await r.json());
  },
  async update(
    itemId: number,
    payload: Partial<CreateItemPayload>
  ): Promise<void> {
    if (USE_MOCKS) {
      await delay(500);
      mockItems = mockItems.map((i) =>
        i.id === itemId
          ? {
              ...i,
              ...payload,
              ownerId:
                payload.ownerId === null ? 0 : (payload.ownerId ?? i.ownerId),
              ownerGroupId:
                payload.ownerGroupId === null
                  ? undefined
                  : (payload.ownerGroupId ?? i.ownerGroupId),
            }
          : i
      );
      return;
    }
    const r = await fetch(`/api/v1/items/${itemId}`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(r);
  },
  async remove(itemId: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(200);
      mockItems = mockItems.filter((i) => i.id !== itemId);
      return;
    }
    const r = await fetch(`/api/v1/items/${itemId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await ensureOk(r);
  },
  async getCategories(): Promise<Category[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockCategories];
    }
    const r = await fetch('/api/v1/categories/', { headers: authHeaders() });
    await ensureOk(r);
    return ((await r.json()) as BackendCat[]).map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id ?? null,
    }));
  },
  async getLocations(): Promise<Location[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockLocations];
    }
    const r = await fetch('/api/v1/locations/', { headers: authHeaders() });
    await ensureOk(r);
    return ((await r.json()) as BackendLocation[]).map((l) => ({
      id: l.id,
      name: l.name,
      kind: l.kind,
      building: l.building ?? undefined,
      room: l.room ?? undefined,
      cabinet: l.cabinet ?? undefined,
      shelf: l.shelf ?? undefined,
      mapX: l.mapX ?? undefined,
      mapY: l.mapY ?? undefined,
    }));
  },
  async getOwners(): Promise<Owner[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockOwners];
    }
    const r = await fetch('/api/v1/auth/users', { headers: authHeaders() });
    await ensureOk(r);
    return ((await r.json()) as { id: number; email: string }[]).map((u) => ({
      id: u.id,
      fullName: u.email,
    }));
  },
  async getStatuses(): Promise<Status[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockStatuses];
    }
    const r = await fetch('/api/v1/item-status/', { headers: authHeaders() });
    await ensureOk(r);
    return (
      (await r.json()) as { id: number; name: string; is_system: boolean }[]
    ).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, ''),
      type: s.is_system ? 'system' : 'custom',
    }));
  },
  async createLocation(payload: CreateLocationPayload): Promise<Location> {
    if (USE_MOCKS) {
      await delay(200);
      const loc: Location = {
        id: mockLocations.length + 1,
        name: payload.name,
        kind: payload.kind,
        building: payload.building,
        room: payload.room,
        cabinet: payload.cabinet,
        shelf: payload.shelf,
        mapX: payload.mapX,
        mapY: payload.mapY,
      };
      mockLocations.push(loc);
      return loc;
    }
    const r = await fetch('/api/v1/locations/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(r);
    const data = (await r.json()) as BackendLocation;
    return mapLocation(data);
  },
  async updateLocationPoint(
    locationId: number,
    payload: UpdateLocationPayload
  ): Promise<Location> {
    if (USE_MOCKS) {
      await delay(200);
      const current = mockLocations.find((location) => location.id === locationId);
      if (!current) throw new Error('Lokalizacja nie istnieje.');
      Object.assign(current, payload);
      return current;
    }
    const r = await fetch(`/api/v1/locations/${locationId}`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(r);
    return mapLocation((await r.json()) as BackendLocation);
  },
  async deleteLocationPoint(locationId: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(200);
      const index = mockLocations.findIndex((location) => location.id === locationId);
      if (index === -1) throw new Error('Lokalizacja nie istnieje.');
      mockLocations.splice(index, 1);
      mockItems = mockItems.map((item) =>
        item.locationId === locationId ? { ...item, locationId: 0 } : item
      );
      return;
    }
    const r = await fetch(`/api/v1/locations/${locationId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    await ensureOk(r);
  },
  async updateLocation(itemId: number, locationId: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(200);
      mockItems = mockItems.map((i) =>
        i.id === itemId ? { ...i, locationId } : i
      );
      return;
    }
    const r = await fetch(`/api/v1/items/${itemId}`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ locationId }),
    });
    await ensureOk(r);
  },
  async getGroups(): Promise<Group[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockGroups];
    }
    const r = await fetch('/api/v1/groups/', { headers: authHeaders() });
    await ensureOk(r);
    return ((await r.json()) as BackendGroup[]).map((g) => ({
      id: g.id,
      name: g.name,
    }));
  },
};

function mapItem(i: BackendItem): Item {
  return {
    id: i.id,
    systemId: i.systemId ?? undefined,
    name: i.name,
    manufacturer: i.manufacturer ?? '',
    model: i.model ?? undefined,
    serial: i.serial ?? undefined,
    inventoryNumber: i.inventoryNumber ?? undefined,
    description: i.description ?? undefined,
    purchaseDate: i.purchaseDate ?? undefined,
    addedAt: i.addedAt ?? undefined,
    categoryId: i.categoryId ?? 0,
    statusId: i.statusId ?? 0,
    locationId: i.locationId ?? 0,
    ownerId: i.ownerId ?? i.owner_id ?? 0,
    ownerGroupId: i.ownerGroupId ?? undefined,
    legacyItemId: i.legacyItemId ?? undefined,
  };
}

function mapLocation(l: BackendLocation): Location {
  return {
    id: l.id,
    name: l.name,
    kind: l.kind ?? 'internal',
    building: l.building ?? undefined,
    room: l.room ?? undefined,
    cabinet: l.cabinet ?? undefined,
    shelf: l.shelf ?? undefined,
    mapX: l.mapX ?? undefined,
    mapY: l.mapY ?? undefined,
  };
}
