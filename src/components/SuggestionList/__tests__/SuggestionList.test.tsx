import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SuggestionList from '../SuggestionList';
import type { PopularDish } from '../../../types/DishEntry';

const mockGetSuggestionsForCountry = vi.fn<(code: string) => PopularDish[]>();

vi.mock('../../../providers/SyncStatusProvider', () => ({
  useSyncStatus: () => ({
    isOnline: true,
    pendingCount: 0,
    addDishEntry: vi.fn().mockResolvedValue({}),
    deleteDishEntry: vi.fn(),
    getDishEntriesForCountry: () => [],
    getCountriesWithDishes: () => new Set<string>(),
    getSuggestionsForCountry: (...args: [string]) => mockGetSuggestionsForCountry(...args),
    uploadPhoto: vi.fn().mockResolvedValue(''),
  }),
}));

function makeDish(overrides: Partial<PopularDish> = {}): PopularDish {
  return {
    id: crypto.randomUUID(),
    country_code: 'THA',
    name: 'Pad Thai',
    recipe_link: 'https://example.com/pad-thai',
    sort_order: 1,
    ...overrides,
  };
}

describe('SuggestionList', () => {
  it('renders nothing when no suggestions are available', () => {
    mockGetSuggestionsForCountry.mockReturnValue([]);

    const { container } = render(<SuggestionList countryCode="THA" />);

    expect(container.innerHTML).toBe('');
  });

  it('renders a section with heading when suggestions exist', () => {
    mockGetSuggestionsForCountry.mockReturnValue([makeDish()]);

    render(<SuggestionList countryCode="THA" />);

    expect(screen.getByRole('heading', { name: /try next/i })).toBeInTheDocument();
  });

  it('displays up to 3 suggestion dish names', () => {
    mockGetSuggestionsForCountry.mockReturnValue([
      makeDish({ name: 'Pad Thai', sort_order: 1 }),
      makeDish({ name: 'Green Curry', sort_order: 2 }),
      makeDish({ name: 'Tom Yum', sort_order: 3 }),
    ]);

    render(<SuggestionList countryCode="THA" />);

    expect(screen.getByText('Pad Thai')).toBeInTheDocument();
    expect(screen.getByText('Green Curry')).toBeInTheDocument();
    expect(screen.getByText('Tom Yum')).toBeInTheDocument();
  });

  it('renders recipe links that open in a new tab', () => {
    mockGetSuggestionsForCountry.mockReturnValue([
      makeDish({ name: 'Pad Thai', recipe_link: 'https://example.com/pad-thai' }),
    ]);

    render(<SuggestionList countryCode="THA" />);

    const link = screen.getByRole('link', { name: /recipe for pad thai/i });
    expect(link).toHaveAttribute('href', 'https://example.com/pad-thai');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows "link unavailable" for empty recipe links', () => {
    mockGetSuggestionsForCountry.mockReturnValue([
      makeDish({ name: 'Broken Dish', recipe_link: '' }),
    ]);

    render(<SuggestionList countryCode="THA" />);

    expect(screen.getByText('Broken Dish')).toBeInTheDocument();
    expect(screen.getByText('link unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows "link unavailable" for invalid recipe links (no http/https)', () => {
    mockGetSuggestionsForCountry.mockReturnValue([
      makeDish({ name: 'Bad Link Dish', recipe_link: 'not-a-url' }),
    ]);

    render(<SuggestionList countryCode="THA" />);

    expect(screen.getByText('Bad Link Dish')).toBeInTheDocument();
    expect(screen.getByText('link unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('passes the countryCode to getSuggestionsForCountry', () => {
    mockGetSuggestionsForCountry.mockReturnValue([]);

    render(<SuggestionList countryCode="JPN" />);

    expect(mockGetSuggestionsForCountry).toHaveBeenCalledWith('JPN');
  });

  it('renders in a section element with aria-labelledby', () => {
    mockGetSuggestionsForCountry.mockReturnValue([makeDish()]);

    render(<SuggestionList countryCode="THA" />);

    const section = screen.getByRole('region', { name: /try next/i });
    expect(section).toBeInTheDocument();
  });
});
