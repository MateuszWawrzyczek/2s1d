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
  const toggleExpanded = (cid: number) =>
    setExpandedIds((prev) => {
      const s = new Set(prev);
      if (s.has(cid)) s.delete(cid);
      else s.add(cid);
      return s;
    });
  const isLoading = (cid: number) => loadingIds.includes(cid);

  const renderNode = (node: CategoryTreeNode, depth = 0) => {
    const { category, children } = node;
    const hasChildren = children && children.length > 0;
    const expanded = expandedIds.has(category.id);
    const isVirtualRoot =
      category.id === 0 &&
      category.parentId === null &&
      category.name === 'Root' &&
      depth === 0;
    if (isVirtualRoot)
      return (
        <div key="virtual-root">
          {hasChildren && children.map((c) => renderNode(c, depth))}
        </div>
      );
    return (
      <div key={category.id}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 10px',
            paddingLeft: `${10 + depth * 24}px`,
            marginBottom: 2,
            backgroundColor: isLoading(category.id)
              ? 'var(--surface-2)'
              : 'transparent',
            borderRadius: 'var(--radius-sm)',
            gap: 8,
            transition: 'background 0.15s',
          }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="btn btn-ghost btn-sm"
              style={{
                width: 24,
                height: 24,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
              }}
              title={expanded ? 'Zwiń' : 'Rozwiń'}
            >
              {expanded ? '▼' : '▶'}
            </button>
          ) : (
            <div style={{ width: 24 }} />
          )}
          {isLoading(category.id) && (
            <div
              className="spinner"
              style={{ width: 14, height: 14, borderWidth: 1.5 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                opacity: isLoading(category.id) ? 0.6 : 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {category.name}
            </div>
            {category.description && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {category.description}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onAddSubcategory(category.id)}
              disabled={isLoading(category.id)}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}
            >
              + Dodaj
            </button>
            <button
              onClick={() => onEdit(category)}
              disabled={isLoading(category.id)}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}
            >
              Edytuj
            </button>
            <button
              onClick={() => onDelete(category.id)}
              disabled={isLoading(category.id)}
              className="btn btn-sm btn-danger"
              style={{ fontSize: 11, padding: '3px 8px' }}
            >
              Usuń
            </button>
          </div>
        </div>
        {hasChildren && expanded && (
          <div>{children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };
  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {renderNode(tree)}
    </div>
  );
};
