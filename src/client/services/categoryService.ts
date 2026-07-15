import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryTreeNode,
} from '../types/category';
import { authHeaders, jsonAuthHeaders } from './authHeaders';

const USE_MOCKS = import.meta.env.MODE === 'test';
const BASE_URL = '/api/v1/categories';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BackendCat {
  id: number;
  name: string;
  parent_id: number | null;
  description?: string;
}

const INITIAL: Category[] = [
  { id: 1, name: 'Aparatura pomiarowa', parentId: null },
  { id: 2, name: 'Przyrządy analityczne', parentId: null },
  { id: 3, name: 'Meble laboratoryjne', parentId: null },
  { id: 4, name: 'Ochrona osobista', parentId: null },
  { id: 5, name: 'Spektrometry', parentId: 1 },
  { id: 6, name: 'Mikroskopy', parentId: 1 },
  { id: 7, name: 'Czujniki temperatury', parentId: 1 },
  { id: 8, name: 'Chromatografia', parentId: 2 },
  { id: 9, name: 'Spektrofotometry', parentId: 2 },
  { id: 10, name: 'Stoły robocze', parentId: 3 },
  { id: 11, name: 'Szafy suszarnicze', parentId: 3 },
];
let mock: Category[] = INITIAL.map((c) => ({ ...c }));
let nextId = 12;

export const _resetForTesting = (): void => {
  mock = INITIAL.map((c) => ({ ...c }));
  nextId = 12;
};

export const categoryService = {
  async getAll(): Promise<Category[]> {
    if (!USE_MOCKS) {
      const r = await fetch(`${BASE_URL}/`, { headers: authHeaders() });
      await handleResponse(r);
      return ((await r.json()) as BackendCat[]).map(mapCat);
    }
    await delay(100);
    return [...mock];
  },
  async getTree(): Promise<CategoryTreeNode> {
    if (!USE_MOCKS) {
      const cats = await this.getAll();
      return buildTree(cats);
    }
    await delay(150);
    const tree = buildTree(mock);
    tree.category = { id: 0, name: 'Root', parentId: null };
    return tree;
  },
  async create(payload: CreateCategoryPayload): Promise<Category> {
    if (!USE_MOCKS) {
      const r = await fetch(`${BASE_URL}/`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          name: payload.name,
          parent_id: payload.parentId ?? null,
          description: payload.description,
        }),
      });
      await handleResponse(r);
      return mapCat((await r.json()) as BackendCat);
    }
    await delay(300);
    const c: Category = {
      id: nextId++,
      name: payload.name,
      parentId: payload.parentId ?? null,
      description: payload.description,
    };
    mock = [...mock, c];
    return c;
  },
  async update(id: number, payload: UpdateCategoryPayload): Promise<Category> {
    if (!USE_MOCKS) {
      const r = await fetch(`${BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: jsonAuthHeaders(),
        body: JSON.stringify(payload),
      });
      await handleResponse(r);
      return mapCat((await r.json()) as BackendCat);
    }
    await delay(300);
    const idx = mock.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Kategoria nie istnieje');
    mock[idx] = { ...mock[idx], ...payload };
    return mock[idx];
  },
  async remove(id: number): Promise<void> {
    if (!USE_MOCKS) {
      const r = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      await handleResponse(r);
      return;
    }
    await delay(300);
    const ids = new Set<number>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of mock) {
        if (category.parentId !== null && ids.has(category.parentId) && !ids.has(category.id)) {
          ids.add(category.id);
          changed = true;
        }
      }
    }
    mock = mock.filter((c) => !ids.has(c.id));
  },
};

function mapCat(c: BackendCat): Category {
  return {
    id: c.id,
    name: c.name,
    parentId: c.parent_id ?? null,
    description: c.description,
  };
}

function buildTree(categories: Category[]): CategoryTreeNode {
  const build = (parentId: number | null): CategoryTreeNode[] =>
    categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({ category: c, children: build(c.id) }));
  return {
    category: { id: 0, name: 'Root', parentId: null },
    children: build(null),
  };
}

async function handleResponse(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {}
  throw new Error(detail);
}

export default categoryService;
