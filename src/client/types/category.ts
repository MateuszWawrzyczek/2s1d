export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  description?: string;
  created_at?: string;
}

export interface CreateCategoryPayload {
  name: string;
  parentId?: number | null;
  description?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
}

export interface CategoryTreeNode {
  category: Category;
  children: CategoryTreeNode[];
}
