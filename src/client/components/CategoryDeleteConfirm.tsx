import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Category } from '../types/category';
import './CategoryDeleteConfirm.css';

interface CategoryDeleteConfirmProps {
  category: Category | null;
  childCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CategoryDeleteConfirm: React.FC<CategoryDeleteConfirmProps> = ({
  category,
  childCount,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) onCancel();
  };
  if (!category) return null;
  const hasChildren = childCount > 0;
  return (
    <div
      className="category-delete-dialog-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="category-delete-dialog">
        <div className="dialog-header">
          <h2>Usuń kategorię</h2>
        </div>
        <div className="dialog-body">
          <p className="delete-message">
            Czy na pewno chcesz usunąć kategorię{' '}
            <strong>{category.name}</strong>?
          </p>
          {hasChildren && (
            <div className="warning-box">
              <p className="warning-title">
                <AlertTriangle
                  size={14}
                  style={{ marginRight: 4, verticalAlign: -2 }}
                />
                Ostrzeżenie
              </p>
              <p>
                Ta kategoria zawiera <strong>{childCount}</strong>{' '}
                {childCount === 1 ? 'podkategorię' : 'podkategorii'}.
              </p>
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Anuluj
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? 'Usuwanie...'
              : hasChildren
                ? 'Usuń kategorię i jej podkategorie'
                : 'Usuń'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryDeleteConfirm;
