/**
 * KONTRAKT API – po podłączeniu backendu zamień mock na fetch:
 *
 * GET    /api/v1/categories          → Category[]
 * POST   /api/v1/categories          → Category        body: CreateCategoryPayload
 * PUT    /api/v1/categories/:id      → Category        body: UpdateCategoryPayload
 * DELETE /api/v1/categories/:id      → 204 No Content
 *
 * Błędy walidacyjne: { detail: string } z kodem 422
 */

import type {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryTreeNode,
} from '../types/category';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const INITIAL_CATEGORIES: Category[] = [
  {
    id: 1,
    name: 'Aparatura pomiarowa',
    parentId: null,
    description: 'Urządzenia do precyzyjnych pomiarów laboratoryjnych',
  },
  {
    id: 2,
    name: 'Przyrządy analityczne',
    parentId: null,
    description: 'Sprzęt do analizy chemicznej i biologicznej',
  },
  {
    id: 3,
    name: 'Meble laboratoryjne',
    parentId: null,
    description: 'Stoły, szafy oraz regały do pracy i przechowywania',
  },
  {
    id: 4,
    name: 'Ochrona osobista',
    parentId: null,
    description: 'Elementy ochronne używane w laboratoriach',
  },
  {
    id: 5,
    name: 'Spektrometry',
    parentId: 1,
    description: 'Przyrządy do pomiaru widma i identyfikacji próbek',
  },
  {
    id: 6,
    name: 'Mikroskopy',
    parentId: 1,
    description: 'Instrumenty do obserwacji próbek w powiększeniu',
  },
  {
    id: 7,
    name: 'Czujniki temperatury',
    parentId: 1,
    description: 'Termometry i rejestratory temperatury',
  },
  {
    id: 8,
    name: 'Chromatografia',
    parentId: 2,
    description: 'Systemy do separacji i analizy substancji',
  },
  {
    id: 9,
    name: 'Spektrofotometry',
    parentId: 2,
    description: 'Urządzenia do pomiaru absorpcji światła',
  },
  {
    id: 10,
    name: 'Stoły robocze',
    parentId: 3,
    description: 'Stabilne stanowiska do pracy laboratoryjnej',
  },
  {
    id: 11,
    name: 'Szafy suszarnicze',
    parentId: 3,
    description: 'Szafy do suszenia i przechowywania próbek',
  },
];

let mockCategories: Category[] = INITIAL_CATEGORIES.map((cat) => ({ ...cat }));
let nextId = 12;

export const _resetForTesting = (): void => {
  mockCategories = INITIAL_CATEGORIES.map((cat) => ({ ...cat }));
  nextId = 12;
};

const _fetchCategories = (): Category[] => {
  return [...mockCategories];
};

const _validateCategoryName = (name: string): void => {
  if (!name || name.trim().length === 0) {
    throw new Error('Nazwa kategorii nie może być pusta');
  }
};

const _checkDuplicateName = (
  name: string,
  parentId: number | null,
  excludeId?: number
): void => {
  const isDuplicate = mockCategories.some(
    (cat) =>
      cat.name === name &&
      cat.parentId === parentId &&
      (excludeId === undefined || cat.id !== excludeId)
  );
  if (isDuplicate) {
    throw new Error(
      'Kategoria o tej nazwie już istnieje na tym poziomie hierarchii'
    );
  }
};

export const categoryService = {
  async getAll(): Promise<Category[]> {
    await delay(100);
    return _fetchCategories();
  },

  async getTree(): Promise<CategoryTreeNode> {
    await delay(150);
    const categories = _fetchCategories();

    const buildTree = (parentId: number | null): CategoryTreeNode[] => {
      return categories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          category: cat,
          children: buildTree(cat.id),
        }));
    };

    const rootChildren = buildTree(null);

    // Return a virtual root node containing all root categories as children
    return {
      category: {
        id: 0,
        name: 'Root',
        parentId: null,
      },
      children: rootChildren,
    };
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    await delay(300);

    _validateCategoryName(payload.name);
    _checkDuplicateName(payload.name, payload.parentId ?? null);

    // If parentId is provided, verify it exists
    if (payload.parentId !== null && payload.parentId !== undefined) {
      const parentExists = mockCategories.some(
        (cat) => cat.id === payload.parentId
      );
      if (!parentExists) {
        throw new Error('Kategoria nadrzędna nie istnieje');
      }
    }

    const newCategory: Category = {
      id: nextId++,
      name: payload.name,
      parentId: payload.parentId ?? null,
      description: payload.description,
    };
    mockCategories = [...mockCategories, newCategory];
    return newCategory;
  },

  async update(id: number, payload: UpdateCategoryPayload): Promise<Category> {
    await delay(300);
    const category = mockCategories.find((cat) => cat.id === id);
    if (!category) throw new Error('Kategoria nie istnieje');

    if (payload.name !== undefined) {
      _validateCategoryName(payload.name);
      _checkDuplicateName(payload.name, category.parentId, id);
    }

    const updated = { ...category, ...payload };
    mockCategories = mockCategories.map((cat) =>
      cat.id === id ? updated : cat
    );
    return updated;
  },

  async remove(id: number): Promise<void> {
    await delay(300);
    const category = mockCategories.find((cat) => cat.id === id);
    if (!category) throw new Error('Kategoria nie istnieje');

    // Check if category has children
    const hasChildren = mockCategories.some((cat) => cat.parentId === id);
    if (hasChildren) {
      throw new Error('Nie można usunąć kategorii, która ma podkategorie');
    }

    mockCategories = mockCategories.filter((cat) => cat.id !== id);
  },
};

export default categoryService;
