import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CountryPanel from '../CountryPanel';
import type { DishEntry } from '../../../types/DishEntry';
import { DishStoreProvider } from '../../../store/DishStore';

const mockDeleteDishEntry = vi.fn().mockResolvedValue(undefined);
let mockEntriesForCountry: DishEntry[] = [];

// Mock the SyncStatusProvider used by DishForm and DishList
vi.mock('../../../providers/SyncStatusProvider', () => ({
  useSyncStatus: () => ({
    isOnline: true,
    pendingCount: 0,
    addDishEntry: vi.fn().mockResolvedValue({}),
    deleteDishEntry: mockDeleteDishEntry,
    getDishEntriesForCountry: () => mockEntriesForCountry,
    getCountriesWithDishes: () => new Set<string>(),
    getSuggestionsForCountry: () => [],
    uploadPhoto: vi.fn().mockResolvedValue(''),
  }),
}));

// --- Helpers ---

function makeDishEntry(overrides: Partial<DishEntry> = {}): DishEntry {
  return {
    id: crypto.randomUUID(),
    household_id: 'household-1',
    country_code: 'THA',
    name: 'Pad Thai',
    rating: 8,
    photo_path: null,
    ingredients: [],
    notes: null,
    recipe_link: null,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    created_by: 'user-1',
    sync_status: 'synced',
    ...overrides,
  };
}

function renderCountryPanel(
  country = { code: 'THA', name: 'Thailand' },
  onClose = vi.fn(),
) {
  return render(
    <DishStoreProvider>
      <CountryPanel country={country} onClose={onClose} />
    </DishStoreProvider>,
  );
}

// --- CountryPanel Tests ---

describe('CountryPanel', () => {
  beforeEach(() => {
    mockEntriesForCountry = [];
    mockDeleteDishEntry.mockClear();
  });

  it('renders the country name as a heading', () => {
    renderCountryPanel({ code: 'ITA', name: 'Italy' });
    expect(screen.getByRole('heading', { name: 'Italy' })).toBeInTheDocument();
  });

  it('renders a close button', () => {
    renderCountryPanel();
    expect(screen.getByRole('button', { name: /close panel/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    renderCountryPanel({ code: 'THA', name: 'Thailand' }, onClose);

    await userEvent.click(screen.getByRole('button', { name: /close panel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders an aside with an accessible label', () => {
    renderCountryPanel({ code: 'JPN', name: 'Japan' });
    expect(screen.getByRole('complementary', { name: /dishes for japan/i })).toBeInTheDocument();
  });

  it('renders the DishForm', () => {
    renderCountryPanel();
    expect(screen.getByRole('form', { name: /add a dish/i })).toBeInTheDocument();
  });

  it('displays dishes for the selected country', () => {
    mockEntriesForCountry = [
      makeDishEntry({ name: 'Pad Thai', country_code: 'THA' }),
      makeDishEntry({ name: 'Green Curry', country_code: 'THA' }),
    ];

    renderCountryPanel({ code: 'THA', name: 'Thailand' });

    expect(screen.getByText('Pad Thai')).toBeInTheDocument();
    expect(screen.getByText('Green Curry')).toBeInTheDocument();
  });

  it('shows empty message when no dishes exist for the country', () => {
    renderCountryPanel({ code: 'THA', name: 'Thailand' });
    expect(screen.getByText(/no dishes added yet/i)).toBeInTheDocument();
  });

  it('calls deleteDishEntry when delete is confirmed', async () => {
    const entry = makeDishEntry({ id: 'dish-1', name: 'Pad Thai', country_code: 'THA' });
    mockEntriesForCountry = [entry];

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderCountryPanel({ code: 'THA', name: 'Thailand' });

    expect(screen.getByText('Pad Thai')).toBeInTheDocument();

    // Expand the card to access the delete button
    await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete pad thai/i }));

    expect(window.confirm).toHaveBeenCalledWith('Delete "Pad Thai"?');
    expect(mockDeleteDishEntry).toHaveBeenCalledWith('dish-1');
  });

  it('does not call deleteDishEntry when delete is cancelled', async () => {
    const entry = makeDishEntry({ id: 'dish-1', name: 'Pad Thai', country_code: 'THA' });
    mockEntriesForCountry = [entry];

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderCountryPanel({ code: 'THA', name: 'Thailand' });

    // Expand the card to access the delete button
    await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete pad thai/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteDishEntry).not.toHaveBeenCalled();
  });
});
