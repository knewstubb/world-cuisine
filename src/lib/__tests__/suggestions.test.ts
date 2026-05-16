import { describe, it, expect } from 'vitest';
import { dishNameMatches, getUncookedSuggestions } from '../suggestions';
import type { PopularDish } from '../../types/DishEntry';

function makeDish(name: string, sortOrder: number): PopularDish {
  return {
    id: `id-${sortOrder}`,
    country_code: 'JP',
    name,
    recipe_link: `https://example.com/${sortOrder}`,
    sort_order: sortOrder,
  };
}

describe('dishNameMatches', () => {
  it('returns true for exact match', () => {
    expect(dishNameMatches('Sushi', 'Sushi')).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(dishNameMatches('sushi', 'SUSHI')).toBe(true);
    expect(dishNameMatches('Pad Thai', 'pad thai')).toBe(true);
  });

  it('returns true when strings differ only by whitespace', () => {
    expect(dishNameMatches('  Sushi  ', 'Sushi')).toBe(true);
    expect(dishNameMatches('Sushi', '  sushi  ')).toBe(true);
  });

  it('returns true for combined case and whitespace differences', () => {
    expect(dishNameMatches('  PAD THAI  ', 'pad thai')).toBe(true);
  });

  it('returns false for different names', () => {
    expect(dishNameMatches('Sushi', 'Ramen')).toBe(false);
  });

  it('returns false for partial matches', () => {
    expect(dishNameMatches('Sushi Roll', 'Sushi')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(dishNameMatches('', '')).toBe(true);
    expect(dishNameMatches('  ', '')).toBe(true);
    expect(dishNameMatches('Sushi', '')).toBe(false);
  });
});

describe('getUncookedSuggestions', () => {
  const dishes = [
    makeDish('Sushi', 1),
    makeDish('Ramen', 2),
    makeDish('Tempura', 3),
    makeDish('Udon', 4),
    makeDish('Miso Soup', 5),
  ];

  it('returns first 3 dishes by sort_order when nothing is cooked', () => {
    const result = getUncookedSuggestions(dishes, []);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Sushi');
    expect(result[1].name).toBe('Ramen');
    expect(result[2].name).toBe('Tempura');
  });

  it('filters out cooked dishes and returns next available', () => {
    const result = getUncookedSuggestions(dishes, ['Sushi']);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Ramen');
    expect(result[1].name).toBe('Tempura');
    expect(result[2].name).toBe('Udon');
  });

  it('uses case-insensitive matching for filtering', () => {
    const result = getUncookedSuggestions(dishes, ['sushi', 'RAMEN']);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Tempura');
    expect(result[1].name).toBe('Udon');
    expect(result[2].name).toBe('Miso Soup');
  });

  it('uses trimmed matching for filtering', () => {
    const result = getUncookedSuggestions(dishes, ['  Sushi  ']);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Ramen');
  });

  it('returns fewer than 3 when not enough uncooked dishes', () => {
    const result = getUncookedSuggestions(dishes, ['Sushi', 'Ramen', 'Tempura', 'Udon']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Miso Soup');
  });

  it('returns empty array when all dishes are cooked', () => {
    const result = getUncookedSuggestions(dishes, [
      'Sushi', 'Ramen', 'Tempura', 'Udon', 'Miso Soup',
    ]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when popularDishes is empty', () => {
    const result = getUncookedSuggestions([], ['Sushi']);
    expect(result).toHaveLength(0);
  });

  it('handles unsorted input by sorting by sort_order', () => {
    const unsorted = [
      makeDish('Udon', 4),
      makeDish('Sushi', 1),
      makeDish('Tempura', 3),
      makeDish('Ramen', 2),
    ];
    const result = getUncookedSuggestions(unsorted, []);
    expect(result[0].name).toBe('Sushi');
    expect(result[1].name).toBe('Ramen');
    expect(result[2].name).toBe('Tempura');
  });

  it('does not mutate the original array', () => {
    const original = [...dishes];
    getUncookedSuggestions(dishes, ['Sushi']);
    expect(dishes).toEqual(original);
  });
});
