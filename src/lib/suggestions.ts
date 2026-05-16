import type { PopularDish } from '../types/DishEntry';

/**
 * Compares two dish names using case-insensitive trimmed matching.
 * Returns true if the two strings are equal after trimming whitespace
 * and converting to lowercase.
 */
export function dishNameMatches(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Returns up to 3 uncooked popular dishes sorted by sort_order ascending.
 * Filters out any popular dish whose name matches (case-insensitive, trimmed)
 * any name in the cookedNames array.
 */
export function getUncookedSuggestions(
  popularDishes: PopularDish[],
  cookedNames: string[]
): PopularDish[] {
  const sorted = [...popularDishes].sort((a, b) => a.sort_order - b.sort_order);

  const uncooked = sorted.filter(
    (dish) => !cookedNames.some((cooked) => dishNameMatches(dish.name, cooked))
  );

  return uncooked.slice(0, 3);
}
