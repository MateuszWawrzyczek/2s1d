import { describe, it, expect, beforeEach, vi } from 'vitest';
import { categoryService, _resetForTesting } from './categoryService';
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category';

describe('categoryService', () => {
  // Helper to create fresh service state for each test
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  describe('getAll()', () => {
    it('should return array of categories with correct structure', async () => {
      const categories = await categoryService.getAll();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);

      categories.forEach((category) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('parentId');
        expect(typeof category.id).toBe('number');
        expect(typeof category.name).toBe('string');
        expect(
          category.parentId === null || typeof category.parentId === 'number'
        ).toBe(true);
      });
    });

    it('should return all categories from mock data', async () => {
      const categories = await categoryService.getAll();
      expect(categories.length).toBeGreaterThanOrEqual(11);
    });

    it('should include root categories (parentId: null)', async () => {
      const categories = await categoryService.getAll();
      const rootCategories = categories.filter((cat) => cat.parentId === null);

      expect(rootCategories.length).toBeGreaterThan(0);
      expect(
        rootCategories.some((cat) => cat.name === 'Aparatura pomiarowa')
      ).toBe(true);
      expect(
        rootCategories.some((cat) => cat.name === 'Przyrządy analityczne')
      ).toBe(true);
    });

    it('should include child categories with parentId set', async () => {
      const categories = await categoryService.getAll();
      const childCategories = categories.filter((cat) => cat.parentId !== null);

      expect(childCategories.length).toBeGreaterThan(0);
      expect(
        childCategories.some(
          (cat) => cat.name === 'Spektrometry' && cat.parentId === 1
        )
      ).toBe(true);
    });

    it('should return a copy of categories (not mutable original)', async () => {
      const categories1 = await categoryService.getAll();
      const categories2 = await categoryService.getAll();

      expect(categories1).toEqual(categories2);
      expect(categories1).not.toBe(categories2);
    });
  });

  describe('getTree()', () => {
    it('should return tree with proper nesting structure', async () => {
      const tree = await categoryService.getTree();

      expect(tree).toHaveProperty('category');
      expect(tree).toHaveProperty('children');
      expect(Array.isArray(tree.children)).toBe(true);
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should have virtual root category with id 0', async () => {
      const tree = await categoryService.getTree();

      expect(tree.category).toHaveProperty('id');
      expect(tree.category).toHaveProperty('name');
      expect(tree.category.id).toBe(0);
      expect(tree.category.name).toBe('Root');
    });

    it('should have root categories as direct children of virtual root', async () => {
      const tree = await categoryService.getTree();

      const rootChildren = tree.children;
      expect(rootChildren.length).toBeGreaterThan(0);

      const rootCategoryNames = rootChildren.map((node) => node.category.name);
      expect(rootCategoryNames).toContain('Aparatura pomiarowa');
      expect(rootCategoryNames).toContain('Przyrządy analityczne');
      expect(rootCategoryNames).toContain('Meble laboratoryjne');
      expect(rootCategoryNames).toContain('Ochrona osobista');
    });

    it('should nest child categories under their parents', async () => {
      const tree = await categoryService.getTree();

      const measurementNode = tree.children.find(
        (node) => node.category.name === 'Aparatura pomiarowa'
      );
      expect(measurementNode).toBeDefined();
      expect(measurementNode!.children.length).toBeGreaterThan(0);

      const childNames = measurementNode!.children.map(
        (child) => child.category.name
      );
      expect(childNames).toContain('Spektrometry');
      expect(childNames).toContain('Mikroskopy');
      expect(childNames).toContain('Czujniki temperatury');
    });

    it('should have correct parentId relationships in tree', async () => {
      const tree = await categoryService.getTree();

      const measurementNode = tree.children.find(
        (node) => node.category.name === 'Aparatura pomiarowa'
      );
      measurementNode!.children.forEach((child) => {
        expect(child.category.parentId).toBe(measurementNode!.category.id);
      });
    });

    it('should handle empty children arrays for leaf nodes', async () => {
      const tree = await categoryService.getTree();

      const spectrometerNode = tree.children
        .find((node) => node.category.name === 'Aparatura pomiarowa')
        ?.children.find((node) => node.category.name === 'Spektrometry');

      expect(spectrometerNode).toBeDefined();
      expect(Array.isArray(spectrometerNode!.children)).toBe(true);
    });
  });

  describe('create()', () => {
    it('should create new category with all required fields', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Nowa Kategoria',
        parentId: null,
        description: 'Test description',
      };

      const created = await categoryService.create(payload);

      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('name');
      expect(created).toHaveProperty('parentId');
      expect(created.name).toBe('Nowa Kategoria');
      expect(created.parentId).toBe(null);
      expect(created.description).toBe('Test description');
    });

    it('should create child category with parentId', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Podkategoria',
        parentId: 1,
        description: 'Child category under Aparatura pomiarowa',
      };

      const created = await categoryService.create(payload);

      expect(created.parentId).toBe(1);
      expect(created.name).toBe('Podkategoria');
    });

    it('should assign unique id to created category', async () => {
      const categories1 = await categoryService.getAll();
      const maxId1 = Math.max(...categories1.map((cat) => cat.id));

      const payload: CreateCategoryPayload = {
        name: 'Kategoria A',
        parentId: null,
      };

      const created = await categoryService.create(payload);
      expect(created.id).toBeGreaterThan(maxId1);
    });

    it('should make created category visible in getAll()', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Widoczna Kategoria',
        parentId: null,
      };

      const created = await categoryService.create(payload);
      const allCategories = await categoryService.getAll();

      const found = allCategories.find((cat) => cat.id === created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Widoczna Kategoria');
    });

    it('should throw error when name is empty string', async () => {
      const payload: CreateCategoryPayload = {
        name: '',
        parentId: null,
      };

      await expect(categoryService.create(payload)).rejects.toThrow(
        'Nazwa kategorii nie może być pusta'
      );
    });

    it('should throw error when name is only whitespace', async () => {
      const payload: CreateCategoryPayload = {
        name: '   ',
        parentId: null,
      };

      await expect(categoryService.create(payload)).rejects.toThrow(
        'Nazwa kategorii nie może być pusta'
      );
    });

    it('should throw error when name is undefined', async () => {
      const payload = {
        name: undefined,
        parentId: null,
      } as unknown as CreateCategoryPayload;

      await expect(categoryService.create(payload)).rejects.toThrow();
    });

    it('should prevent duplicate names at root level', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Aparatura pomiarowa',
        parentId: null,
      };

      await expect(categoryService.create(payload)).rejects.toThrow(
        'Kategoria o tej nazwie już istnieje na tym poziomie hierarchii'
      );
    });

    it('should prevent duplicate names at same parent level', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Spektrometry',
        parentId: 1,
      };

      await expect(categoryService.create(payload)).rejects.toThrow(
        'Kategoria o tej nazwie już istnieje na tym poziomie hierarchii'
      );
    });

    it('should allow duplicate names at different parent levels', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Ekspozycja',
        parentId: 1,
      };

      const created1 = await categoryService.create(payload);
      expect(created1.parentId).toBe(1);

      const payload2: CreateCategoryPayload = {
        name: 'Ekspozycja',
        parentId: 2,
      };

      const created2 = await categoryService.create(payload2);
      expect(created2.parentId).toBe(2);
      expect(created2.name).toBe('Ekspozycja');
    });

    it('should allow same name at root and child levels', async () => {
      const payloadRoot: CreateCategoryPayload = {
        name: 'TestKat',
        parentId: null,
      };

      const root = await categoryService.create(payloadRoot);
      expect(root.parentId).toBe(null);

      const payloadChild: CreateCategoryPayload = {
        name: 'TestKat',
        parentId: 1,
      };

      const child = await categoryService.create(payloadChild);
      expect(child.parentId).toBe(1);
    });

    it('should throw error when parent category does not exist', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Nowa Kategoria',
        parentId: 99999,
      };

      await expect(categoryService.create(payload)).rejects.toThrow(
        'Kategoria nadrzędna nie istnieje'
      );
    });

    it('should handle optional parentId (treat as null)', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Bez Rodzica',
        description: 'No parent specified',
      };

      const created = await categoryService.create(payload);
      expect(created.parentId).toBe(null);
    });

    it('should handle optional description', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Bez Opisu',
        parentId: null,
      };

      const created = await categoryService.create(payload);
      expect(created.name).toBe('Bez Opisu');
    });
  });

  describe('update()', () => {
    it('should update category name', async () => {
      const payload: UpdateCategoryPayload = {
        name: 'Aparatura pomiarowa Współczesna',
      };

      const updated = await categoryService.update(1, payload);

      expect(updated.id).toBe(1);
      expect(updated.name).toBe('Aparatura pomiarowa Współczesna');
    });

    it('should update category description', async () => {
      const payload: UpdateCategoryPayload = {
        description: 'Nowy opis',
      };

      const updated = await categoryService.update(1, payload);

      expect(updated.description).toBe('Nowy opis');
      expect(updated.name).toBe('Aparatura pomiarowa');
    });

    it('should update both name and description', async () => {
      const payload: UpdateCategoryPayload = {
        name: 'Artystyka',
        description: 'Kategoria art',
      };

      const updated = await categoryService.update(2, payload);

      expect(updated.name).toBe('Artystyka');
      expect(updated.description).toBe('Kategoria art');
    });

    it('should make changes visible in getAll()', async () => {
      await categoryService.update(1, {
        name: 'Aparatura pomiarowa Zabytkowa',
      });

      const allCategories = await categoryService.getAll();
      const updated = allCategories.find((cat) => cat.id === 1);

      expect(updated?.name).toBe('Aparatura pomiarowa Zabytkowa');
    });

    it('should throw error when category does not exist', async () => {
      const payload: UpdateCategoryPayload = {
        name: 'Nowa Nazwa',
      };

      await expect(categoryService.update(99999, payload)).rejects.toThrow(
        'Kategoria nie istnieje'
      );
    });

    it('should throw error when name is empty string', async () => {
      const payload: UpdateCategoryPayload = {
        name: '',
      };

      await expect(categoryService.update(1, payload)).rejects.toThrow(
        'Nazwa kategorii nie może być pusta'
      );
    });

    it('should throw error when name is only whitespace', async () => {
      const payload: UpdateCategoryPayload = {
        name: '  \n  ',
      };

      await expect(categoryService.update(1, payload)).rejects.toThrow(
        'Nazwa kategorii nie może być pusta'
      );
    });

    it('should prevent duplicate name at same parent level', async () => {
      const payload: UpdateCategoryPayload = {
        name: 'Meble laboratoryjne',
      };

      await expect(categoryService.update(1, payload)).rejects.toThrow(
        'Kategoria o tej nazwie już istnieje na tym poziomie hierarchii'
      );
    });

    it('should allow updating to same name (exclude self from duplicate check)', async () => {
      const category = await categoryService
        .getAll()
        .then((cats) => cats.find((cat) => cat.id === 1));

      const payload: UpdateCategoryPayload = {
        name: category!.name,
      };

      const updated = await categoryService.update(1, payload);
      expect(updated.name).toBe(category!.name);
    });

    it('should allow update with name that does not conflict at different parent level', async () => {
      const payload: UpdateCategoryPayload = {
        name: 'Spektrometry',
      };

      const updated = await categoryService.update(2, payload);
      expect(updated.name).toBe('Spektrometry');
      expect(updated.parentId).toBe(null);
    });

    it('should not validate when name is not provided', async () => {
      const payload: UpdateCategoryPayload = {
        description: 'Only updating description',
      };

      const updated = await categoryService.update(1, payload);
      expect(updated.description).toBe('Only updating description');
    });

    it('should maintain other properties when updating', async () => {
      const before = await categoryService
        .getAll()
        .then((cats) => cats.find((cat) => cat.id === 5));

      const payload: UpdateCategoryPayload = {
        description: 'Updated description only',
      };

      const updated = await categoryService.update(5, payload);

      expect(updated.id).toBe(before!.id);
      expect(updated.parentId).toBe(before!.parentId);
    });
  });

  describe('remove()', () => {
    it('should remove category from service', async () => {
      const beforeCount = (await categoryService.getAll()).length;

      await categoryService.remove(10);

      const afterCount = (await categoryService.getAll()).length;
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should make removed category inaccessible', async () => {
      await categoryService.remove(7);

      const allCategories = await categoryService.getAll();
      expect(allCategories.find((cat) => cat.id === 7)).toBeUndefined();
    });

    it('should remove child categories successfully', async () => {
      await categoryService.remove(5);

      const allCategories = await categoryService.getAll();
      expect(allCategories.find((cat) => cat.id === 5)).toBeUndefined();
    });

    it('should throw error when category does not exist', async () => {
      await expect(categoryService.remove(99999)).rejects.toThrow(
        'Kategoria nie istnieje'
      );
    });

    it('should throw error when trying to remove category with children', async () => {
      await expect(categoryService.remove(1)).rejects.toThrow(
        'Nie można usunąć kategorii, która ma podkategorie'
      );
    });

    it('should throw error when trying to remove parent with any child', async () => {
      await expect(categoryService.remove(2)).rejects.toThrow(
        'Nie można usunąć kategorii, która ma podkategorie'
      );
    });

    it('should not remove if it has children, leaving state unchanged', async () => {
      const beforeCount = (await categoryService.getAll()).length;

      try {
        await categoryService.remove(1);
      } catch {
        // Expected to fail
      }

      const afterCount = (await categoryService.getAll()).length;
      expect(afterCount).toBe(beforeCount);
    });

    it('should be able to remove category after its children are removed', async () => {
      await categoryService.remove(5);
      await categoryService.remove(6);
      await categoryService.remove(7);

      const beforeCount = (await categoryService.getAll()).length;
      await categoryService.remove(1);
      const afterCount = (await categoryService.getAll()).length;

      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should allow removing multiple separate leaf categories', async () => {
      const beforeCount = (await categoryService.getAll()).length;

      await categoryService.remove(7);
      await categoryService.remove(6);

      const afterCount = (await categoryService.getAll()).length;
      expect(afterCount).toBe(beforeCount - 2);
    });
  });

  describe('Integration: getTree after operations', () => {
    it('should reflect created category in tree', async () => {
      const payload: CreateCategoryPayload = {
        name: 'Test Kategoria',
        parentId: 1,
      };

      const created = await categoryService.create(payload);
      const tree = await categoryService.getTree();

      const apparatusNode = tree.children.find(
        (node) => node.category.name === 'Aparatura pomiarowa'
      );
      if (!apparatusNode) {
        throw new Error('Aparatura pomiarowa node not found');
      }
      const testNode = apparatusNode.children.find(
        (node) => node.category.id === created.id
      );

      expect(testNode).toBeDefined();
      expect(testNode?.category.name).toBe('Test Kategoria');
    });

    it('should reflect updated category name in tree', async () => {
      await categoryService.update(5, { name: 'Obraz i Spektrometry' });
      const tree = await categoryService.getTree();

      const apparatusNode = tree.children.find(
        (node) => node.category.name === 'Aparatura pomiarowa'
      );
      if (!apparatusNode) {
        throw new Error('Aparatura pomiarowa node not found');
      }
      const updated = apparatusNode.children.find(
        (node) => node.category.id === 5
      );

      expect(updated?.category.name).toBe('Obraz i Spektrometry');
    });

    it('should reflect removed category in tree', async () => {
      const treeBefore = await categoryService.getTree();
      const apparatusNodeBefore = treeBefore.children.find(
        (node) => node.category.name === 'Aparatura pomiarowa'
      );
      if (!apparatusNodeBefore) {
        throw new Error('Aparatura pomiarowa node not found');
      }
      const childCountBefore = apparatusNodeBefore.children.length;

      await categoryService.remove(5);

      const treeAfter = await categoryService.getTree();
      const apparatusNodeAfter = treeAfter.children.find(
        (node) => node.category.name === 'Aparatura pomiarowa'
      );
      if (!apparatusNodeAfter) {
        throw new Error('Aparatura pomiarowa node not found after removal');
      }
      const childCountAfter = apparatusNodeAfter.children.length;

      expect(childCountAfter).toBe(childCountBefore - 1);
    });
  });
});
