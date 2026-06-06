import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CategoriesPage } from './CategoriesPage';

vi.mock('../services/categoryService');

const mockCategoryService = vi.mocked(
  await import('../services/categoryService')
).default;

const mockTreeNode = {
  category: { id: 0, name: 'Root', parentId: null },
  children: [
    {
      category: {
        id: 1,
        name: 'Aparatura pomiarowa',
        parentId: null,
        description: 'Urządzenia do pomiarów laboratoryjnych',
      },
      children: [
        {
          category: {
            id: 5,
            name: 'Spektrometry',
            parentId: 1,
            description: 'Przyrządy do analizy widmowej',
          },
          children: [],
        },
      ],
    },
    {
      category: {
        id: 2,
        name: 'Przyrządy analityczne',
        parentId: null,
        description: 'Sprzęt do analiz chemicznych',
      },
      children: [],
    },
  ],
};

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCategoryService.getTree.mockResolvedValue(mockTreeNode);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the title "Zarządzanie Kategoriami"', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Zarządzanie Kategoriami')).toBeInTheDocument();
      });
    });

    it('should show loading spinner initially', () => {
      mockCategoryService.getTree.mockImplementation(
        () => new Promise(() => {})
      );

      render(<CategoriesPage />);

      expect(screen.getByText('Ładowanie kategorii...')).toBeInTheDocument();
    });

    it('should show error message when load fails', async () => {
      const errorMessage = 'Nie udało się załadować kategorii.';
      mockCategoryService.getTree.mockRejectedValue(new Error(errorMessage));

      render(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should render CategoryTree component with loaded data', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Aparatura pomiarowa')).toBeInTheDocument();
        expect(screen.getByText('Przyrządy analityczne')).toBeInTheDocument();
        expect(screen.getByText('Struktura kategorii')).toBeInTheDocument();
      });
    });

    it('should render "Create Root Category" button', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Nowa kategoria główna')).toBeInTheDocument();
      });
    });

    it('should show empty message when tree has no categories', async () => {
      mockCategoryService.getTree.mockResolvedValue({
        category: { id: 0, name: 'Root', parentId: null },
        children: [],
      });

      render(<CategoriesPage />);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Brak kategorii. Utwórz nową kategorię główną, aby zacząć.'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('Loading tree on mount', () => {
    it('should load tree on component mount', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        expect(mockCategoryService.getTree).toHaveBeenCalledTimes(1);
      });
    });

    it('should call getTree only once on mount', async () => {
      const { rerender } = render(<CategoriesPage />);

      await waitFor(() => {
        expect(mockCategoryService.getTree).toHaveBeenCalledTimes(1);
      });

      rerender(<CategoriesPage />);

      expect(mockCategoryService.getTree).toHaveBeenCalledTimes(1);
    });
  });

  describe('Root category form', () => {
    it('should open root category form when button clicked', async () => {
      render(<CategoriesPage />);

      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);

      expect(screen.getByText('Add Root Category')).toBeInTheDocument();
    });

    it('should disable create button when form is open', async () => {
      render(<CategoriesPage />);

      const button = (await screen.findByText(
        '+ Nowa kategoria główna'
      )) as HTMLButtonElement;
      fireEvent.click(button);

      await waitFor(() => {
        expect(button.disabled).toBe(true);
      });
    });

    it('should call service.create() with correct payload when root form submitted', async () => {
      mockCategoryService.create.mockResolvedValue({
        id: 100,
        name: 'Nowa aparatura',
        parentId: null,
        description: 'Nowa kolekcja',
      });

      render(<CategoriesPage />);

      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);

      const nameInput = screen.getByPlaceholderText('Enter category name');
      const descriptionInput = screen.getByPlaceholderText(
        'Enter category description (optional)'
      );
      const submitButton = screen.getByText('Add Category');

      await userEvent.type(nameInput, 'Nowa aparatura');
      await userEvent.type(descriptionInput, 'Nowa kolekcja');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCategoryService.create).toHaveBeenCalledWith({
          name: 'Nowa aparatura',
          description: 'Nowa kolekcja',
        });
      });
    });

    it('should reload tree after successful root form submission', async () => {
      mockCategoryService.create.mockResolvedValue({
        id: 100,
        name: 'Nowa aparatura',
        parentId: null,
      });

      render(<CategoriesPage />);

      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);

      const nameInput = screen.getByPlaceholderText('Enter category name');
      const submitButton = screen.getByText('Add Category');

      await userEvent.type(nameInput, 'Nowa aparatura');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCategoryService.getTree).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Subcategory form', () => {
    it('should open subcategory form when "Add" clicked on a category', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);
      });

      expect(screen.getByText('Add Subcategory')).toBeInTheDocument();
    });

    it('should call service.create() with parentId when subcategory form submitted', async () => {
      mockCategoryService.create.mockResolvedValue({
        id: 101,
        name: 'Mikroskopy',
        parentId: 1,
        description: 'Mikroskopy laboratoryjne',
      });

      render(<CategoriesPage />);

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);
      });

      const nameInput = screen.getByPlaceholderText('Enter category name');
      const descriptionInput = screen.getByPlaceholderText(
        'Enter category description (optional)'
      );
      const submitButton = screen.getByText('Add Category');

      await userEvent.type(nameInput, 'Mikroskopy');
      await userEvent.type(descriptionInput, 'Mikroskopy laboratoryjne');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCategoryService.create).toHaveBeenCalledWith({
          name: 'Mikroskopy',
          parentId: 1,
          description: 'Mikroskopy laboratoryjne',
        });
      });
    });

    it('should reload tree after successful subcategory form submission', async () => {
      mockCategoryService.create.mockResolvedValue({
        id: 101,
        name: 'Mikroskopy',
        parentId: 1,
      });

      render(<CategoriesPage />);

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);
      });

      const nameInput = screen.getByPlaceholderText('Enter category name');
      const submitButton = screen.getByText('Add Category');

      await userEvent.type(nameInput, 'Mikroskopy');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCategoryService.getTree).toHaveBeenCalledTimes(2);
      });
    });

    it('should disable create button when subcategory form is open', async () => {
      render(<CategoriesPage />);

      const button = (await screen.findByText(
        '+ Nowa kategoria główna'
      )) as HTMLButtonElement;

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);
      });

      await waitFor(() => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('Edit category', () => {
    it('should open edit dialog when "Edit" clicked on a category', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
      });

      expect(screen.getByText('Edit Category')).toBeInTheDocument();
    });

    it('should call service.update() when edit dialog submitted', async () => {
      mockCategoryService.update.mockResolvedValue({
        id: 1,
        name: 'Aparatura pomiarowa Współczesna',
        parentId: null,
        description: 'Urządzenia do pomiarów laboratoryjnych',
      });

      render(<CategoriesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
      });

      const nameInput = screen.getByDisplayValue(
        'Aparatura pomiarowa'
      ) as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Aparatura pomiarowa Współczesna');

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCategoryService.update).toHaveBeenCalledWith(1, {
          name: 'Aparatura pomiarowa Współczesna',
          description: 'Urządzenia do pomiarów laboratoryjnych',
        });
      });
    });

    it('should reload tree after successful edit dialog submission', async () => {
      mockCategoryService.update.mockResolvedValue({
        id: 1,
        name: 'Aparatura pomiarowa',
        parentId: null,
      });

      render(<CategoriesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCategoryService.getTree).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Delete category', () => {
    it('should open delete confirm dialog when "Delete" clicked on a category', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText('Usuń kategorię')).toBeInTheDocument();
    });

    it('should call service.remove() when delete confirmed', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      render(<CategoriesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      const confirmButton = screen.getByRole('button', {
        name: /Usuń kategorię i jej podkategorie/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCategoryService.remove).toHaveBeenCalledWith(1);
      });
    });

    it('should reload tree after successful deletion', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      render(<CategoriesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      const confirmButton = screen.getByRole('button', {
        name: /Usuń kategorię i jej podkategorie/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCategoryService.getTree).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error handling', () => {
    it('should show error message during CRUD operation (create)', async () => {
      mockCategoryService.create.mockRejectedValue(
        new Error('Błąd przy tworzeniu kategorii.')
      );

      render(<CategoriesPage />);

      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);

      const nameInput = screen.getByPlaceholderText('Enter category name');
      const submitButton = screen.getByText('Add Category');

      await userEvent.type(nameInput, 'Test');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorAlerts = screen.getAllByText(
          'Błąd przy tworzeniu kategorii.'
        );
        expect(errorAlerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error message during CRUD operation (update)', async () => {
      mockCategoryService.update.mockRejectedValue(
        new Error('Błąd przy aktualizacji kategorii.')
      );

      render(<CategoriesPage />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
      });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        const errorAlerts = screen.getAllByText(
          'Błąd przy aktualizacji kategorii.'
        );
        expect(errorAlerts.length).toBeGreaterThan(0);
      });
    });

    it('should show error message during CRUD operation (delete)', async () => {
      mockCategoryService.remove.mockRejectedValue(
        new Error('Błąd przy usuwaniu kategorii.')
      );

      render(<CategoriesPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      const confirmButton = screen.getByRole('button', {
        name: /Usuń kategorię i jej podkategorie/i,
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(
          screen.getByText('Błąd przy usuwaniu kategorii.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Retry functionality', () => {
    it('should show retry button when initial load fails', async () => {
      mockCategoryService.getTree.mockRejectedValue(
        new Error('Nie udało się załadować kategorii.')
      );

      render(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Spróbuj ponownie')).toBeInTheDocument();
      });
    });

    it('should reload tree when retry button clicked', async () => {
      mockCategoryService.getTree.mockRejectedValueOnce(
        new Error('Nie udało się załadować kategorii.')
      );

      render(<CategoriesPage />);

      const retryButton = await screen.findByText('Spróbuj ponownie');

      mockCategoryService.getTree.mockResolvedValue(mockTreeNode);
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Aparatura pomiarowa')).toBeInTheDocument();
      });
    });
  });

  describe('Form cancellation', () => {
    it('should close root form when Cancel clicked', async () => {
      render(<CategoriesPage />);

      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Add Root Category')).not.toBeInTheDocument();
    });

    it('should close subcategory form when Cancel clicked', async () => {
      render(<CategoriesPage />);

      await waitFor(() => {
        const addButtons = screen.getAllByText('Add');
        fireEvent.click(addButtons[0]);
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Add Subcategory')).not.toBeInTheDocument();
    });

    it('should re-enable create button after closing form', async () => {
      render(<CategoriesPage />);

      const button = (await screen.findByText(
        '+ Nowa kategoria główna'
      )) as HTMLButtonElement;
      fireEvent.click(button);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(button.disabled).toBe(false);
      });
    });
  });

  describe('Multiple category operations', () => {
    it('should handle multiple edits sequentially', async () => {
      mockCategoryService.update.mockResolvedValue({
        id: 1,
        name: 'Updated 1',
        parentId: null,
      });

      render(<CategoriesPage />);

      await waitFor(
        () => {
          const editButtons = screen.getAllByText('Edit');
          fireEvent.click(editButtons[0]);
        },
        { timeout: 3000 }
      );

      let nameInput = screen.getByDisplayValue(
        'Aparatura pomiarowa'
      ) as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated 1');

      let saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCategoryService.update).toHaveBeenCalledWith(1, {
          name: 'Updated 1',
          description: 'Urządzenia do pomiarów laboratoryjnych',
        });
      });

      mockCategoryService.update.mockClear();
      mockCategoryService.getTree.mockClear();
      mockCategoryService.getTree.mockResolvedValue(mockTreeNode);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);
      });

      nameInput = screen.getByDisplayValue(
        'Aparatura pomiarowa'
      ) as HTMLInputElement;
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated 2');

      saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCategoryService.update).toHaveBeenCalledWith(1, {
          name: 'Updated 2',
          description: 'Urządzenia do pomiarów laboratoryjnych',
        });
      });
    });
  });
});
