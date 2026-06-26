import React, { useState, useEffect, useCallback } from 'react';
import {
  Category,
  CategoryTreeNode,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category';
import categoryService from '../services/categoryService';
import { CategoryTree } from '../components/CategoryTree';
import { CategoryForm } from '../components/CategoryForm';
import { CategoryEditDialog } from '../components/CategoryEditDialog';
import { CategoryDeleteConfirm } from '../components/CategoryDeleteConfirm';

export const CategoriesPage: React.FC = () => {
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [showCreateRootForm, setShowCreateRootForm] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null
  );

  const handleLoadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategoryTree(await categoryService.getTree());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się załadować kategorii.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void handleLoadTree();
    }, 0);
    return () => window.clearTimeout(t);
  }, [handleLoadTree]);
  useEffect(() => {
    if (operationError) {
      const t = setTimeout(() => setOperationError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [operationError]);

  const handleCreateRoot = async (payload: CreateCategoryPayload) => {
    try {
      setOperationError(null);
      await categoryService.create(payload);
      setShowCreateRootForm(false);
      await handleLoadTree();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : 'Błąd przy tworzeniu kategorii.'
      );
    }
  };

  const handleCreateSubcategory = async (
    parentId: number,
    payload: CreateCategoryPayload
  ) => {
    try {
      setOperationError(null);
      setLoadingIds((p) => [...p, parentId]);
      await categoryService.create({ ...payload, parentId });
      setSelectedParentId(null);
      await handleLoadTree();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : 'Błąd przy tworzeniu podkategorii.'
      );
    } finally {
      setLoadingIds((p) => p.filter((id) => id !== parentId));
    }
  };

  const handleUpdateCategory = async (
    id: number,
    payload: UpdateCategoryPayload
  ) => {
    try {
      setOperationError(null);
      setLoadingIds((p) => [...p, id]);
      await categoryService.update(id, payload);
      setEditingCategory(null);
      await handleLoadTree();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : 'Błąd przy aktualizacji kategorii.'
      );
    } finally {
      setLoadingIds((p) => p.filter((di) => di !== id));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      setOperationError(null);
      setLoadingIds((p) => [...p, id]);
      await categoryService.remove(id);
      setDeletingCategory(null);
      await handleLoadTree();
    } catch (err) {
      setOperationError(
        err instanceof Error ? err.message : 'Błąd przy usuwaniu kategorii.'
      );
    } finally {
      setLoadingIds((p) => p.filter((di) => di !== id));
    }
  };

  const getChildCount = (parentId: number): number => {
    if (!categoryTree) return 0;
    const count = (node: CategoryTreeNode): number => {
      let c = 0;
      if (node.category.id === parentId && node.children)
        c = node.children.length;
      if (node.children) for (const child of node.children) c += count(child);
      return c;
    };
    return count(categoryTree);
  };

  const findById = (tree: CategoryTreeNode, id: number): Category | null => {
    if (tree.category.id === id) return tree.category;
    if (tree.children)
      for (const child of tree.children) {
        const f = findById(child, id);
        if (f) return f;
      }
    return null;
  };

  if (loading)
    return (
      <div style={{ maxWidth: 1400 }}>
        <h1
          style={{
            marginTop: 0,
            marginBottom: 30,
            color: 'var(--text)',
            fontSize: 28,
          }}
        >
          Zarządzanie Kategoriami
        </h1>
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie kategorii...</span>
        </div>
      </div>
    );
  if (error)
    return (
      <div style={{ maxWidth: 1400 }}>
        <h1
          style={{
            marginTop: 0,
            marginBottom: 30,
            color: 'var(--text)',
            fontSize: 28,
          }}
        >
          Zarządzanie Kategoriami
        </h1>
        <div
          style={{
            padding: 20,
            backgroundColor: 'var(--danger-muted)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius)',
            color: 'var(--danger)',
          }}
        >
          <div className="alert alert-error">{error}</div>
          <button
            onClick={handleLoadTree}
            className="btn btn-primary"
            style={{ marginTop: 12 }}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 1400 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Zarządzanie Kategoriami</h1>
          <p className="page-subtitle">
            Zarządzaj strukturą kategorii wyposażenia laboratoryjnego
          </p>
        </div>
        <button
          onClick={() => setShowCreateRootForm(true)}
          disabled={showCreateRootForm || selectedParentId !== null}
          className="btn btn-primary"
        >
          + Nowa kategoria główna
        </button>
      </div>
      {operationError && (
        <div className="alert alert-error">{operationError}</div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) 1fr',
          gap: 20,
        }}
      >
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: 24,
            backgroundColor: 'var(--surface)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 15,
              color: 'var(--text)',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            Struktura kategorii
          </h2>
          {categoryTree && categoryTree.children.length > 0 ? (
            <CategoryTree
              tree={{
                category: categoryTree.category,
                children: categoryTree.children,
              }}
              onAddSubcategory={(parentId) => setSelectedParentId(parentId)}
              onEdit={(cat) => setEditingCategory(cat)}
              onDelete={(catId) => {
                const f = findById(categoryTree, catId);
                if (f) setDeletingCategory(f);
              }}
              loadingIds={loadingIds}
            />
          ) : (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 14,
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Brak kategorii. Utwórz nową kategorię główną, aby zacząć.
            </div>
          )}
        </div>
        {(showCreateRootForm || selectedParentId !== null) && (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: 24,
              backgroundColor: 'var(--surface)',
              height: 'fit-content',
              position: 'sticky',
              top: 20,
            }}
          >
            <CategoryForm
              mode={showCreateRootForm ? 'root' : 'subcategory'}
              parentCategoryId={selectedParentId ?? undefined}
              onSubmit={(payload) => {
                if (showCreateRootForm) void handleCreateRoot(payload);
                else if (selectedParentId !== null)
                  void handleCreateSubcategory(selectedParentId, payload);
              }}
              onCancel={() => {
                setShowCreateRootForm(false);
                setSelectedParentId(null);
              }}
              loading={
                selectedParentId !== null &&
                loadingIds.includes(selectedParentId)
              }
              error={operationError ?? undefined}
            />
          </div>
        )}
      </div>
      {editingCategory && (
        <CategoryEditDialog
          key={editingCategory.id}
          category={editingCategory}
          onSave={handleUpdateCategory}
          onCancel={() => setEditingCategory(null)}
          loading={loadingIds.includes(editingCategory.id)}
          error={operationError ?? undefined}
        />
      )}
      {deletingCategory && (
        <CategoryDeleteConfirm
          category={deletingCategory}
          childCount={getChildCount(deletingCategory.id)}
          onConfirm={() => handleDeleteCategory(deletingCategory.id)}
          onCancel={() => setDeletingCategory(null)}
          loading={loadingIds.includes(deletingCategory.id)}
        />
      )}
    </div>
  );
};

export default CategoriesPage;
