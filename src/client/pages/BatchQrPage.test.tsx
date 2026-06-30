import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BatchQrPage from './BatchQrPage';

vi.mock('../services/itemService', () => ({
  itemService: {
    getAll: vi.fn(),
  },
}));

vi.mock('../services/batchQrService', () => ({
  batchQrService: {
    download: vi.fn(),
    downloadImages: vi.fn(),
  },
}));

const { itemService } = await import('../services/itemService');
const { batchQrService } = await import('../services/batchQrService');

describe('BatchQrPage', () => {
  beforeEach(() => {
    vi.mocked(itemService.getAll).mockResolvedValue([
      {
        id: 1,
        name: 'Oscyloskop Tektronix TBS1102',
        manufacturer: 'Tektronix',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
      {
        id: 2,
        name: 'Multimetr UNI-T UT61E',
        manufacturer: 'UNI-T',
        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      },
    ]);
    vi.mocked(batchQrService.download).mockResolvedValue(undefined);
    vi.mocked(batchQrService.downloadImages).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('zaznacza wszystkie przedmioty i pobiera PDF dla wybranego rozmiaru', async () => {
    render(<BatchQrPage />);

    await screen.findByText('Oscyloskop Tektronix TBS1102');

    fireEvent.click(screen.getByLabelText('Zaznacz wszystkie przedmioty'));
    expect(screen.getByText('Wybrano: 2 z 2')).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('row', { name: /Oscyloskop Tektronix/ })
      ).getByRole('checkbox')
    ).toBeChecked();
    expect(
      within(screen.getByRole('row', { name: /Multimetr UNI-T/ })).getByRole(
        'checkbox'
      )
    ).toBeChecked();

    fireEvent.change(screen.getByLabelText('Rozmiar'), {
      target: { value: 'large' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PDF' }));

    expect(batchQrService.download).toHaveBeenCalledWith([1, 2], 'large');
  });

  it('pobiera osobne pliki PNG dla wybranych przedmiotów', async () => {
    render(<BatchQrPage />);

    await screen.findByText('Oscyloskop Tektronix TBS1102');

    fireEvent.click(
      screen.getByLabelText('Wybierz Oscyloskop Tektronix TBS1102')
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pobierz PNG osobno' }));

    expect(batchQrService.downloadImages).toHaveBeenCalledWith([1], 'medium');
  });
});
