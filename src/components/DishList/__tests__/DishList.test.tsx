import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DishList from '../DishList';
import type { DishEntry } from '../../../types/DishEntry';

const mockDeleteDishEntry = vi.fn().mockResolvedValue(undefined);
let mockEntries: DishEntry[] = [];

vi.mock('../../../providers/SyncStatusProvider', () => ({
  useSyncStatus: () => ({
    isOnline: true,
    pendingCount: 0,
    addDishEntry: vi.fn().mockResolvedValue({}),
    deleteDishEntry: mockDeleteDishEntry,
    getDishEntriesForCountry: (countryCode: string) =>
      mockEntries.filter((e) => e.country_code === countryCode),
    getCountriesWithDishes: () => new Set<string>(),
    getSuggestionsForCountry: () => [],
    uploadPhoto: vi.fn().mockResolvedValue(''),
  }),
}));

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

describe('DishList', () => {
  beforeEach(() => {
    mockEntries = [];
    mockDeleteDishEntry.mockClear();
  });

  it('shows empty message when no entries exist for the country', () => {
    render(<DishList countryCode="THA" />);
    expect(screen.getByText(/no dishes added yet/i)).toBeInTheDocument();
  });

  it('renders DishEntryCard for each entry', () => {
    mockEntries = [
      makeDishEntry({ id: '1', name: 'Pad Thai' }),
      makeDishEntry({ id: '2', name: 'Green Curry' }),
    ];

    render(<DishList countryCode="THA" />);

    expect(screen.getByText('Pad Thai')).toBeInTheDocument();
    expect(screen.getByText('Green Curry')).toBeInTheDocument();
  });

  it('sorts entries by created_at descending (most recent first)', () => {
    mockEntries = [
      makeDishEntry({ id: '1', name: 'Oldest', created_at: '2024-01-01T10:00:00Z' }),
      makeDishEntry({ id: '2', name: 'Newest', created_at: '2024-03-01T10:00:00Z' }),
      makeDishEntry({ id: '3', name: 'Middle', created_at: '2024-02-01T10:00:00Z' }),
    ];

    render(<DishList countryCode="THA" />);

    const articles = screen.getAllByRole('button');
    const names = articles.map((el) => el.textContent);

    // Newest should appear first
    expect(names[0]).toContain('Newest');
    expect(names[1]).toContain('Middle');
    expect(names[2]).toContain('Oldest');
  });

  it('expands a card when clicked', async () => {
    mockEntries = [
      makeDishEntry({ id: '1', name: 'Pad Thai', notes: 'Delicious!' }),
    ];

    render(<DishList countryCode="THA" />);

    // Notes should not be visible initially
    expect(screen.queryByText('Delicious!')).not.toBeInTheDocument();

    // Click to expand
    await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));

    // Notes should now be visible
    expect(screen.getByText('Delicious!')).toBeInTheDocument();
  });

  it('collapses a card when clicking it again', async () => {
    mockEntries = [
      makeDishEntry({ id: '1', name: 'Pad Thai', notes: 'Delicious!' }),
    ];

    render(<DishList countryCode="THA" />);

    const card = screen.getByRole('button', { name: /pad thai/i });

    // Expand
    await userEvent.click(card);
    expect(screen.getByText('Delicious!')).toBeInTheDocument();

    // Collapse
    await userEvent.click(card);
    expect(screen.queryByText('Delicious!')).not.toBeInTheDocument();
  });

  it('only one card is expanded at a time (accordion behavior)', async () => {
    mockEntries = [
      makeDishEntry({ id: '1', name: 'Pad Thai', notes: 'Thai notes' }),
      makeDishEntry({ id: '2', name: 'Green Curry', notes: 'Curry notes', created_at: '2024-02-01T10:00:00Z' }),
    ];

    render(<DishList countryCode="THA" />);

    // Expand first card
    await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));
    expect(screen.getByText('Thai notes')).toBeInTheDocument();

    // Expand second card — first should collapse
    await userEvent.click(screen.getByRole('button', { name: /green curry/i }));
    expect(screen.getByText('Curry notes')).toBeInTheDocument();
    expect(screen.queryByText('Thai notes')).not.toBeInTheDocument();
  });

  it('calls deleteDishEntry when delete is confirmed', async () => {
    mockEntries = [
      makeDishEntry({ id: 'dish-1', name: 'Pad Thai' }),
    ];

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DishList countryCode="THA" />);

    // Expand to see delete button
    await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete pad thai/i }));

    expect(window.confirm).toHaveBeenCalledWith('Delete "Pad Thai"?');
    expect(mockDeleteDishEntry).toHaveBeenCalledWith('dish-1');
  });

  it('does not call deleteDishEntry when delete is cancelled', async () => {
    mockEntries = [
      makeDishEntry({ id: 'dish-1', name: 'Pad Thai' }),
    ];

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<DishList countryCode="THA" />);

    // Expand to see delete button
    await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));
    await userEvent.click(screen.getByRole('button', { name: /delete pad thai/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteDishEntry).not.toHaveBeenCalled();
  });

  it('only shows entries for the specified country', () => {
    mockEntries = [
      makeDishEntry({ id: '1', name: 'Pad Thai', country_code: 'THA' }),
      makeDishEntry({ id: '2', name: 'Pizza', country_code: 'ITA' }),
    ];

    render(<DishList countryCode="THA" />);

    expect(screen.getByText('Pad Thai')).toBeInTheDocument();
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument();
  });
});
