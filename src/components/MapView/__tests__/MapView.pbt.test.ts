import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { getCountryStyle } from '../MapView';

/**
 * Property 1: Country highlight style correctness
 *
 * For any set of country codes that have dishes and for any country code,
 * the map style function SHALL return the highlighted style if and only if
 * the country code is in the set of countries with dishes, and the default
 * style otherwise.
 *
 * **Validates: Requirements 1.5**
 */
describe('Property 1: Country highlight style correctness', () => {
  const isoA3Arb = fc.stringMatching(/^[A-Z]{3}$/);

  it('returns highlighted style iff country code is in countriesWithDishes', () => {
    fc.assert(
      fc.property(
        fc.array(isoA3Arb, { minLength: 0, maxLength: 20 }),
        isoA3Arb,
        (countryCodes, queryCode) => {
          const countriesWithDishes = new Set(countryCodes);
          const style = getCountryStyle(countriesWithDishes, queryCode);

          if (countriesWithDishes.has(queryCode)) {
            expect(style.fillColor).toBe('#e07b39');
            expect(style.fillOpacity).toBe(0.6);
            expect(style.color).toBe('#b85a1f');
            expect(style.weight).toBe(2);
          } else {
            expect(style.fillColor).toBe('#d4e6f1');
            expect(style.fillOpacity).toBe(0.4);
            expect(style.color).toBe('#7fb3d8');
            expect(style.weight).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
