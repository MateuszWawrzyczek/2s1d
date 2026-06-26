import React, { useState } from 'react';
import type { Category, UpdateCategoryPayload } from '../types/category';
import './CategoryEditDialog.css';

interface CategoryEditDialogProps {
  category: Category | null;
  onSave: (id: number, payload: UpdateCategoryPayload) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export const CategoryEditDialog: React.FC<CategoryEditDialogProps> = ({
  category,
  onSave,
  onCancel,
  loading = false,
  error,
}) => {
  const [name, setName] = useState(() => category?.name ?? '');
  const [description, setDescription] = useState(
    () => category?.description ?? ''
  );
  const [nameError, setNameError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Category name is required');
      return;
    }
    if (!category) return;
    onSave(category.id, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) onCancel();
  };
  if (!category) return null;

  return (
    <div
      className="category-edit-dialog-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="category-edit-dialog">
        <div className="dialog-header">
          <h2>Edit Category</h2>
        </div>
        <div className="dialog-body">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="cat-name">Name *</label>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className={nameError ? 'input-error' : ''}
            />
            {nameError && <span className="field-error">{nameError}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="cat-desc">Description</label>
            <textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>
        </div>
        <div className="dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryEditDialog;
