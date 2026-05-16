import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterSuggestions } from '../AutocompleteInput';

/**
 * Property 4: Autocomplete case-insensitive substring filter
 *
 * For any non-empty search string and for any list of dish names,
 * the autocomplete filter SHALL return exactly those dish names that
 * contain the search string as a substring when compared case-insensitively.
 *
 * **Validates: Requirements 3.1, 3.2**
 */
describe('Feature: cooking-world-map, Property 4: Autocomplete case-insensitive substring filter', () => {
  // Arbitrary for non-empty dish name strings
  const dishNameArb = fc.string({ minLength: 1, maxLength: 50 });
  const dishNamesArb = fc.array(dishNameArb, { minLength: 0, maxLength: 30 });
  const nonEmptyQueryArb = fc.string({ minLength: 1, maxLength: 20 });

  it('returns exactly those names containing the query as a case-insensitive substring', () => {
    fc.assert(
      fc.property(dishNamesArb, nonEmptyQueryArb, (names, query) => {
        const result = filterSuggestions(names, query);
        const lowerQuery = query.toLowerCase();

        // Expected: names that contain the query case-insensitively
        const expected = names.filter((name) =>
          name.toLowerCase().includes(lowerQuery),
        );

        expect(result).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('returns empty array when query is empty', () => {
    fc.assert(
      fc.property(dishNamesArb, (names) => {
        expect(filterSuggestions(names, '')).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it('returns empty array when query is whitespace-only', () => {
    const whitespaceArb = fc
      .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(dishNamesArb, whitespaceArb, (names, wsQuery) => {
        expect(filterSuggestions(names, wsQuery)).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  it('filter result is a subset of the input names', () => {
    fc.assert(
      fc.property(dishNamesArb, nonEmptyQueryArb, (names, query) => {
        const result = filterSuggestions(names, query);
        for (const r of result) {
          expect(names).toContain(r);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('every excluded name does NOT contain the query case-insensitively', () => {
    fc.assert(
      fc.property(dishNamesArb, nonEmptyQueryArb, (names, query) => {
        const result = filterSuggestions(names, query);
        const resultSet = new Set(result);
        const lowerQuery = query.toLowerCase();

        for (const name of names) {
          if (!resultSet.has(name)) {
            expect(name.toLowerCase().includes(lowerQuery)).toBe(false);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
