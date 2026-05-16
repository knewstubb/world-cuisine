import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { Dish } from '../../types/Dish';
import {
  addDishPure,
  deleteDishPure,
  filterDishesForCountry,
  collectCountriesWithDishes,
  isValidDishName,
  saveDishesToStorage,
  loadDishesFromStorage,
} from '../DishStore';

// --- Arbitraries ---

/** Generates a non-empty, non-whitespace-only dish name */
const validDishName = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

/** Generates a 3-letter uppercase country code */
const countryCode = fc.stringMatching(/^[A-Z]{3}$/);

/** Generates a valid Dish object */
const dishArb: fc.Arbitrary<Dish> = fc.record({
  id: fc.uuid(),
  name: validDishName,
  countryCode,
  createdAt: fc.integer({ min: 946684800000, max: 4102444800000 }).map((ts) => new Date(ts).toISOString()),
});

/** Generates a list of dishes */
const dishListArb = fc.array(dishArb, { minLength: 0, maxLength: 20 });

// --- Property 2: Add dish and retrieve by country ---
// **Validates: Requirements 2.2, 2.3**

describe('Property 2: Add dish and retrieve by country', () => {
  it('after adding a dish, getDishesForCountry returns it along with all previous dishes for that country', () => {
    fc.assert(
      fc.property(dishListArb, countryCode, validDishName, (existingDishes, code, name) => {
        const previousForCountry = filterDishesForCountry(existingDishes, code);
        const { dishes: updated, added } = addDishPure(existingDishes, code, name);

        expect(added).toBe(true);

        const afterForCountry = filterDishesForCountry(updated, code);

        // All previous dishes for this country are still present
        for (const prev of previousForCountry) {
          expect(afterForCountry.some((d) => d.id === prev.id)).toBe(true);
        }

        // The new dish is present (by name and countryCode)
        const newDish = afterForCountry.find(
          (d) => d.name === name.trim() && d.countryCode === code && !previousForCountry.some((p) => p.id === d.id),
        );
        expect(newDish).toBeDefined();

        // No duplicates: count should be previous + 1
        expect(afterForCountry.length).toBe(previousForCountry.length + 1);
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 3: Whitespace-only dish names are rejected ---
// **Validates: Requirements 2.4**

describe('Property 3: Whitespace-only dish names are rejected', () => {
  it('whitespace-only or empty strings are rejected and dish list remains unchanged', () => {
    const whitespaceOnly = fc.stringMatching(/^[\s\u00A0]{0,20}$/);

    fc.assert(
      fc.property(dishListArb, countryCode, whitespaceOnly, (existingDishes, code, name) => {
        expect(isValidDishName(name)).toBe(false);

        const { dishes: updated, added } = addDishPure(existingDishes, code, name);

        expect(added).toBe(false);
        // Dish list is unchanged (same reference)
        expect(updated).toBe(existingDishes);
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 5: Dish persistence round-trip ---
// **Validates: Requirements 4.1, 4.2**

describe('Property 5: Dish persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serializing dishes to localStorage and deserializing produces an equivalent list', () => {
    fc.assert(
      fc.property(dishListArb, (dishes) => {
        saveDishesToStorage(dishes);
        const loaded = loadDishesFromStorage();

        expect(loaded.length).toBe(dishes.length);

        for (let i = 0; i < dishes.length; i++) {
          expect(loaded[i].id).toBe(dishes[i].id);
          expect(loaded[i].name).toBe(dishes[i].name);
          expect(loaded[i].countryCode).toBe(dishes[i].countryCode);
          expect(loaded[i].createdAt).toBe(dishes[i].createdAt);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 6: Delete dish removes from store and updates country set ---
// **Validates: Requirements 6.2, 6.3**

describe('Property 6: Delete dish removes from store and updates country set', () => {
  it('after deleting a dish, it no longer appears for its country; if last dish, country is removed from set', () => {
    // Generate a non-empty dish list and pick an index to delete
    const nonEmptyDishList = fc.array(dishArb, { minLength: 1, maxLength: 20 });

    fc.assert(
      fc.property(
        nonEmptyDishList.chain((dishes) =>
          fc.record({
            dishes: fc.constant(dishes),
            index: fc.integer({ min: 0, max: dishes.length - 1 }),
          }),
        ),
        ({ dishes, index }) => {
          const dishToDelete = dishes[index];
          const updated = deleteDishPure(dishes, dishToDelete.id);

          // The deleted dish no longer appears in the filtered list
          const countryDishes = filterDishesForCountry(updated, dishToDelete.countryCode);
          expect(countryDishes.some((d) => d.id === dishToDelete.id)).toBe(false);

          // If it was the last dish for that country, the country should not be in the set
          const countriesWithDishes = collectCountriesWithDishes(updated);
          const remainingForCountry = filterDishesForCountry(updated, dishToDelete.countryCode);

          if (remainingForCountry.length === 0) {
            expect(countriesWithDishes.has(dishToDelete.countryCode)).toBe(false);
          } else {
            expect(countriesWithDishes.has(dishToDelete.countryCode)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
