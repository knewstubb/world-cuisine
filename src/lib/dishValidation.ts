export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a dish name.
 * Must be non-empty after trimming and at most 100 characters.
 */
export function validateDishName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Dish name is required.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Dish name must be 100 characters or fewer.' };
  }
  return { valid: true };
}

/**
 * Validates a rating value.
 * Must be a whole number (integer) between 1 and 10 inclusive.
 * null is invalid (rating is required).
 */
export function validateRating(value: number | null): ValidationResult {
  if (value === null) {
    return { valid: false, error: 'Rating is required.' };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Rating must be a whole number.' };
  }
  if (value < 1 || value > 10) {
    return { valid: false, error: 'Rating must be between 1 and 10.' };
  }
  return { valid: true };
}

/**
 * Validates a recipe link.
 * Must start with http:// or https://.
 * Empty string is valid (field is optional).
 */
export function validateRecipeLink(link: string): ValidationResult {
  if (link === '') {
    return { valid: true };
  }
  if (!link.startsWith('http://') && !link.startsWith('https://')) {
    return { valid: false, error: 'Recipe link must start with http:// or https://.' };
  }
  return { valid: true };
}

/**
 * Parses an ingredients input string into an array.
 * Splits by comma or newline, trims each item, discards empty items,
 * and caps at 50 items.
 */
export function parseIngredients(input: string): string[] {
  const items = input
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return items.slice(0, 50);
}

/**
 * Validates notes text.
 * Max 1000 characters. Empty is valid.
 */
export function validateNotes(notes: string): ValidationResult {
  if (notes.length > 1000) {
    return { valid: false, error: 'Notes must be 1000 characters or fewer.' };
  }
  return { valid: true };
}
