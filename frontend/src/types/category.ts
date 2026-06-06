/**
 * Category API Contract
 *
 * Defines TypeScript interfaces for category management operations.
 * These types correspond to the backend category API responses and request payloads.
 */

/**
 * Represents a category entity.
 */
export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  description?: string;
  created_at?: string;
}

/**
 * Payload for creating a new category.
 */
export interface CreateCategoryPayload {
  name: string;
  parentId?: number | null;
  description?: string;
}

/**
 * Payload for updating an existing category.
 */
export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
}

/**
 * Represents a category with its nested children.
 * Used for hierarchical tree representation of categories.
 */
export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
}
