import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CategoriesPage } from './CategoriesPage';
import categoryService from '../services/categoryService';
import type { CategoryTreeNode } from '../types/category';
import type { Category } from '../types/category';

vi.mock('../services/categoryService');

const mockTreeNode: CategoryTreeNode = {
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
    vi.mocked(categoryService.getTree).mockResolvedValue(mockTreeNode);
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
      vi.mocked(categoryService.getTree).mockImplementation(
        () => new Promise(() => {})
      );
      render(<CategoriesPage />);
      expect(screen.getByText('Ładowanie kategorii...')).toBeInTheDocument();
    });

    it('should show error message when load fails', async () => {
      vi.mocked(categoryService.getTree).mockRejectedValue(
        new Error('Nie udało się załadować kategorii.')
      );
      render(<CategoriesPage />);
      await waitFor(() => {
        expect(
          screen.getByText('Nie udało się załadować kategorii.')
        ).toBeInTheDocument();
      });
    });

    it('should render CategoryTree component with loaded data', async () => {
      render(<CategoriesPage />);
      await waitFor(() => {
        expect(screen.getByText('Aparatura pomiarowa')).toBeInTheDocument();
        expect(screen.getByText('Przyrządy analityczne')).toBeInTheDocument();
      });
    });

    it('should render "Create Root Category" button', async () => {
      render(<CategoriesPage />);
      await waitFor(() => {
        expect(screen.getByText('+ Nowa kategoria główna')).toBeInTheDocument();
      });
    });

    it('should show empty message when tree has no categories', async () => {
      vi.mocked(categoryService.getTree).mockResolvedValue({
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

  describe('Root category form', () => {
    it('should open root category form when button clicked', async () => {
      render(<CategoriesPage />);
      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);
      expect(screen.getByText('Nowa kategoria główna')).toBeInTheDocument();
    });

    it('should call service.create() with correct payload when root form submitted', async () => {
      const mockCategory: Category = {
        id: 100,
        name: 'Nowa aparatura',
        parentId: null,
        description: 'Nowa kolekcja',
      };
      vi.mocked(categoryService.create).mockResolvedValue(mockCategory);
      render(<CategoriesPage />);
      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);
      const nameInput = screen.getByPlaceholderText('Wprowadź nazwę kategorii');
      const descriptionInput = screen.getByPlaceholderText(
        'Opcjonalny opis kategorii'
      );
      const submitButton = screen.getByText('Utwórz');
      await userEvent.type(nameInput, 'Nowa aparatura');
      await userEvent.type(descriptionInput, 'Nowa kolekcja');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(categoryService.create).toHaveBeenCalledWith({
          name: 'Nowa aparatura',
          description: 'Nowa kolekcja',
        });
      });
    });
  });

  describe('Subcategory form', () => {
    it('should open subcategory form when "Add" clicked on a category', async () => {
      render(<CategoriesPage />);
      await waitFor(() => {
        const addButtons = screen.getAllByText('+ Dodaj');
        fireEvent.click(addButtons[0]);
      });
      expect(screen.getByText('Nowa podkategoria')).toBeInTheDocument();
    });

    it('should call service.create() with parentId when subcategory form submitted', async () => {
      const mockCategory: Category = {
        id: 101,
        name: 'Mikroskopy',
        parentId: 1,
        description: 'Mikroskopy laboratoryjne',
      };
      vi.mocked(categoryService.create).mockResolvedValue(mockCategory);
      render(<CategoriesPage />);
      await waitFor(() => {
        const addButtons = screen.getAllByText('+ Dodaj');
        fireEvent.click(addButtons[0]);
      });
      const nameInput = screen.getByPlaceholderText('Wprowadź nazwę kategorii');
      const submitButton = screen.getByText('Utwórz');
      await userEvent.type(nameInput, 'Mikroskopy');
      fireEvent.click(submitButton);
      await waitFor(() => {
        expect(categoryService.create).toHaveBeenCalledWith({
          name: 'Mikroskopy',
          parentId: 1,
        });
      });
    });
  });

  describe('Edit category', () => {
    it('should open edit dialog when "Edit" clicked on a category', async () => {
      render(<CategoriesPage />);
      await waitFor(() => {
        const editButtons = screen.getAllByText('Edytuj');
        fireEvent.click(editButtons[0]);
      });
      expect(screen.getByText('Edit Category')).toBeInTheDocument();
    });

    it('should call service.update() when edit dialog submitted', async () => {
      const mockCategory: Category = {
        id: 1,
        name: 'Aparatura pomiarowa Współczesna',
        parentId: null,
      };
      vi.mocked(categoryService.update).mockResolvedValue(mockCategory);
      render(<CategoriesPage />);
      await waitFor(() => {
        const editButtons = screen.getAllByText('Edytuj');
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
        expect(categoryService.update).toHaveBeenCalledWith(1, {
          name: 'Aparatura pomiarowa Współczesna',
          description: 'Urządzenia do pomiarów laboratoryjnych',
        });
      });
    });
  });

  describe('Delete category', () => {
    it('should open delete confirm when "Delete" clicked', async () => {
      render(<CategoriesPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Usuń');
        fireEvent.click(deleteButtons[0]);
      });
      expect(screen.getByText('Usuń kategorię')).toBeInTheDocument();
    });

    it('should call service.remove() when delete confirmed', async () => {
      vi.mocked(categoryService.remove).mockResolvedValue(undefined);
      render(<CategoriesPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Usuń');
        fireEvent.click(deleteButtons[0]);
      });
      const confirmButton = screen.getByRole('button', {
        name: /Usuń kategorię i jej podkategorie/i,
      });
      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(categoryService.remove).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Error handling', () => {
    it('should show retry button when initial load fails', async () => {
      vi.mocked(categoryService.getTree).mockRejectedValue(
        new Error('Nie udało się załadować kategorii.')
      );
      render(<CategoriesPage />);
      await waitFor(() => {
        expect(screen.getByText('Spróbuj ponownie')).toBeInTheDocument();
      });
    });
  });

  describe('Form cancellation', () => {
    it('should close root form when Cancel clicked', async () => {
      render(<CategoriesPage />);
      const button = await screen.findByText('+ Nowa kategoria główna');
      fireEvent.click(button);
      const cancelButton = screen.getByText('Anuluj');
      fireEvent.click(cancelButton);
      expect(
        screen.queryByText('Nowa kategoria główna')
      ).not.toBeInTheDocument();
    });

    it('should close subcategory form when Cancel clicked', async () => {
      render(<CategoriesPage />);
      await waitFor(() => {
        const addButtons = screen.getAllByText('+ Dodaj');
        fireEvent.click(addButtons[0]);
      });
      const cancelButton = screen.getByText('Anuluj');
      fireEvent.click(cancelButton);
      expect(screen.queryByText('Nowa podkategoria')).not.toBeInTheDocument();
    });
  });
});
