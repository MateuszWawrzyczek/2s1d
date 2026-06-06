import React, { useState } from 'react';
import { Category, CategoryTreeNode } from '../types/category';

interface CategoryTreeProps {
  tree: CategoryTreeNode;
  onAddSubcategory: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: number) => void;
  loadingIds?: number[];
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  tree,
  onAddSubcategory,
  onEdit,
  onDelete,
  loadingIds = [],
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpanded = (categoryId: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const isLoading = (categoryId: number) => loadingIds.includes(categoryId);

  const renderNode = (node: CategoryTreeNode, depth: number = 0) => {
    const { category, children } = node;
    const hasChildren = children && children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const loading = isLoading(category.id);
    const isVirtualRoot =
      category.id === 0 &&
      category.parentId === null &&
      category.name === 'Root' &&
      depth === 0;

    if (isVirtualRoot) {
      return (
        <div key="virtual-root">
          {hasChildren && children.map((child) => renderNode(child, depth))}
        </div>
      );
    }

    return (
      <div key={category.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            marginBottom: '4px',
            backgroundColor: loading ? '#f5f5f5' : 'transparent',
            borderRadius: '4px',
            gap: '8px',
          }}
        >
          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(category.id)}
              style={{
                width: '24px',
                height: '24px',
                padding: '0',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}

          {/* Loading Spinner */}
          {loading && (
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid #e0e0e0',
                borderTop: '2px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          )}

          {/* Category Name and Description */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 500,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {category.name}
            </div>
            {category.description && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '2px',
                }}
              >
                {category.description}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => onAddSubcategory(category.id)}
              disabled={loading}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              title="Add subcategory"
            >
              Add
            </button>
            <button
              onClick={() => onEdit(category)}
              disabled={loading}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              title="Edit category"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(category.id)}
              disabled={loading}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              title="Delete category"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>{children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {renderNode(tree)}
    </div>
  );
};
