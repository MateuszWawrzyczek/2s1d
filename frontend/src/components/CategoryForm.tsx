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
      setValidationError('Name is required');
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
    ) {
      payload.parentId = parentCategoryId;
    }

    onSubmit(payload);

    // Clear form after submission
    setName('');
    setDescription('');
  };

  const displayError = error || validationError;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        {mode === 'root' ? 'Add Root Category' : 'Add Subcategory'}
      </h2>

      <form onSubmit={handleSubmit} className="form">
        {displayError && (
          <div className="alert alert-error">{displayError}</div>
        )}

        <div>
          <label htmlFor="name" className="form-label">
            Name <span style={styles.required}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            disabled={loading}
            className="form-input"
          />
        </div>

        <div>
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter category description (optional)"
            disabled={loading}
            className="form-input"
            rows={4}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Saving...' : 'Add Category'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  } as React.CSSProperties,
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  label: {
    marginBottom: '5px',
    color: '#555',
    fontWeight: 500,
  } as React.CSSProperties,
  required: {
    color: '#e74c3c',
  } as React.CSSProperties,
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  textarea: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontFamily: 'inherit',
    resize: 'vertical',
  } as React.CSSProperties,
  errorMessage: {
    padding: '10px 12px',
    marginBottom: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
  } as React.CSSProperties,
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  } as React.CSSProperties,
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
    flex: 1,
  } as React.CSSProperties,
  submitButton: {
    backgroundColor: '#28a745',
    color: 'white',
  } as React.CSSProperties,
  cancelButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  } as React.CSSProperties,
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  } as React.CSSProperties,
};
