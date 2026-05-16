import { describe, it, expect } from 'vitest';
import {
  validateDishName,
  validateRating,
  validateRecipeLink,
  parseIngredients,
  validateNotes,
} from '../dishValidation';

describe('validateDishName', () => {
  it('accepts a valid dish name', () => {
    expect(validateDishName('Pad Thai')).toEqual({ valid: true });
  });

  it('rejects an empty string', () => {
    const result = validateDishName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a whitespace-only string', () => {
    const result = validateDishName('   \t\n  ');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('accepts a name at exactly 100 characters', () => {
    const name = 'a'.repeat(100);
    expect(validateDishName(name)).toEqual({ valid: true });
  });

  it('rejects a name exceeding 100 characters (trimmed)', () => {
    const name = 'a'.repeat(101);
    const result = validateDishName(name);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('trims leading/trailing whitespace before checking length', () => {
    const name = '  ' + 'a'.repeat(100) + '  ';
    expect(validateDishName(name)).toEqual({ valid: true });
  });
});

describe('validateRating', () => {
  it('accepts integer values 1 through 10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateRating(i)).toEqual({ valid: true });
    }
  });

  it('rejects null', () => {
    const result = validateRating(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects 0', () => {
    expect(validateRating(0).valid).toBe(false);
  });

  it('rejects 11', () => {
    expect(validateRating(11).valid).toBe(false);
  });

  it('rejects floating point numbers', () => {
    expect(validateRating(5.5).valid).toBe(false);
  });

  it('rejects negative numbers', () => {
    expect(validateRating(-1).valid).toBe(false);
  });
});

describe('validateRecipeLink', () => {
  it('accepts an empty string (optional field)', () => {
    expect(validateRecipeLink('')).toEqual({ valid: true });
  });

  it('accepts a link starting with https://', () => {
    expect(validateRecipeLink('https://example.com/recipe')).toEqual({ valid: true });
  });

  it('accepts a link starting with http://', () => {
    expect(validateRecipeLink('http://example.com/recipe')).toEqual({ valid: true });
  });

  it('rejects a link without protocol', () => {
    const result = validateRecipeLink('example.com/recipe');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects a link with ftp:// protocol', () => {
    expect(validateRecipeLink('ftp://example.com').valid).toBe(false);
  });

  it('rejects plain text', () => {
    expect(validateRecipeLink('not a url').valid).toBe(false);
  });
});

describe('parseIngredients', () => {
  it('splits by comma', () => {
    expect(parseIngredients('flour, sugar, butter')).toEqual(['flour', 'sugar', 'butter']);
  });

  it('splits by newline', () => {
    expect(parseIngredients('flour\nsugar\nbutter')).toEqual(['flour', 'sugar', 'butter']);
  });

  it('splits by mixed comma and newline', () => {
    expect(parseIngredients('flour, sugar\nbutter')).toEqual(['flour', 'sugar', 'butter']);
  });

  it('trims whitespace from each item', () => {
    expect(parseIngredients('  flour  ,  sugar  ')).toEqual(['flour', 'sugar']);
  });

  it('discards empty items', () => {
    expect(parseIngredients('flour,,sugar,,')).toEqual(['flour', 'sugar']);
  });

  it('returns empty array for empty input', () => {
    expect(parseIngredients('')).toEqual([]);
  });

  it('caps at 50 items', () => {
    const input = Array.from({ length: 60 }, (_, i) => `item${i}`).join(',');
    const result = parseIngredients(input);
    expect(result.length).toBe(50);
  });
});

describe('validateNotes', () => {
  it('accepts an empty string', () => {
    expect(validateNotes('')).toEqual({ valid: true });
  });

  it('accepts notes within 1000 characters', () => {
    expect(validateNotes('Some notes about the dish')).toEqual({ valid: true });
  });

  it('accepts notes at exactly 1000 characters', () => {
    const notes = 'a'.repeat(1000);
    expect(validateNotes(notes)).toEqual({ valid: true });
  });

  it('rejects notes exceeding 1000 characters', () => {
    const notes = 'a'.repeat(1001);
    const result = validateNotes(notes);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
