import React, { useState } from 'react';
import { Category, UpdateCategoryPayload } from '../types/category';
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

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setNameError('Category name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    if (!category) {
      return;
    }

    const payload: UpdateCategoryPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
    };

    onSave(category.id, payload);
  };

  const handleCancel = () => {
    setNameError('');
    onCancel();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      handleCancel();
    }
  };

  if (!category) {
    return null;
  }

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
            <label htmlFor="category-name">Name *</label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (!name.trim()) {
                  setNameError('Category name is required');
                } else {
                  setNameError('');
                }
              }}
              disabled={loading}
              placeholder="Enter category name"
              className={nameError ? 'input-error' : ''}
            />
            {nameError && <span className="field-error">{nameError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category-description">Description</label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              placeholder="Enter category description (optional)"
              rows={4}
            />
          </div>
        </div>

        <div className="dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={handleCancel}
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
