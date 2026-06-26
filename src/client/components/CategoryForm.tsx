import React, { useState } from 'react';

interface CreateCategoryPayload {
  name: string;
  description?: string;
  parentId?: number;
}
interface CategoryFormProps {
  mode: 'root' | 'subcategory';
  parentCategoryId?: number;
  onSubmit: (payload: CreateCategoryPayload) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  parentCategoryId,
  onSubmit,
  onCancel,
  loading = false,
  error,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!name.trim()) {
      setValidationError('Nazwa jest wymagana');
      return;
    }
    const payload: CreateCategoryPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
    };
    if (
      mode === 'subcategory' &&
      parentCategoryId !== undefined &&
      parentCategoryId !== null
    )
      payload.parentId = parentCategoryId;
    onSubmit(payload);
    setName('');
    setDescription('');
  };
  const displayError = error || validationError;
  return (
    <div>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 16,
          color: 'var(--text)',
        }}
      >
        {mode === 'root' ? 'Nowa kategoria główna' : 'Nowa podkategoria'}
      </h2>
      <form onSubmit={handleSubmit} className="form">
        {displayError && (
          <div className="alert alert-error">{displayError}</div>
        )}
        <div>
          <label htmlFor="name" className="form-label">
            Nazwa *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wprowadź nazwę kategorii"
            disabled={loading}
            className="form-input"
          />
        </div>
        <div>
          <label htmlFor="description" className="form-label">
            Opis
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcjonalny opis kategorii"
            disabled={loading}
            className="form-input"
            rows={3}
          />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Zapisywanie…' : 'Utwórz'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary"
          >
            Anuluj
          </button>
        </div>
      </form>
    </div>
  );
};
