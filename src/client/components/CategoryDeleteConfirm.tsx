import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Category } from '../types/category';
import Dialog from './Dialog';
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
  if (!category) return null;
  const hasChildren = childCount > 0;

  return (
    <Dialog
      className="category-delete-dialog"
      closeDisabled={loading}
      headerClassName="dialog-header"
      onClose={onCancel}
      overlayClassName="category-delete-dialog-backdrop"
      title="Usuń kategorię"
    >
      <div className="dialog-body">
        <p className="delete-message">
          Czy na pewno chcesz usunąć kategorię <strong>{category.name}</strong>?
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
          type="button"
        >
          Anuluj
        </button>
        <button
          className="btn btn-danger"
          onClick={onConfirm}
          disabled={loading}
          type="button"
        >
          {loading
            ? 'Usuwanie...'
            : hasChildren
              ? 'Usuń kategorię i jej podkategorie'
              : 'Usuń'}
        </button>
      </div>
    </Dialog>
  );
};

export default CategoryDeleteConfirm;
