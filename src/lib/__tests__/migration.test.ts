import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectLegacyData, parseLegacyDishes, migrateLegacyDishes } from '../migration';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '../supabase';

const LEGACY_KEY = 'cooking-world-map-dishes';

describe('detectLegacyData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when localStorage key does not exist', () => {
    expect(detectLegacyData()).toBe(false);
  });

  it('returns false when localStorage value is empty array', () => {
    localStorage.setItem(LEGACY_KEY, '[]');
    expect(detectLegacyData()).toBe(false);
  });

  it('returns false when localStorage value is not valid JSON', () => {
    localStorage.setItem(LEGACY_KEY, 'not json');
    expect(detectLegacyData()).toBe(false);
  });

  it('returns false when localStorage value is not an array', () => {
    localStorage.setItem(LEGACY_KEY, '{"name": "test"}');
    expect(detectLegacyData()).toBe(false);
  });

  it('returns true when localStorage has a non-empty array', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ id: '1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01' }])
    );
    expect(detectLegacyData()).toBe(true);
  });
});

describe('parseLegacyDishes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no data exists', () => {
    expect(parseLegacyDishes()).toEqual([]);
  });

  it('returns empty array for invalid JSON', () => {
    localStorage.setItem(LEGACY_KEY, 'invalid');
    expect(parseLegacyDishes()).toEqual([]);
  });

  it('returns parsed dishes from localStorage', () => {
    const dishes = [
      { id: '1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01T00:00:00Z' },
      { id: '2', name: 'Sushi', countryCode: 'JPN', createdAt: '2024-01-02T00:00:00Z' },
    ];
    localStorage.setItem(LEGACY_KEY, JSON.stringify(dishes));
    expect(parseLegacyDishes()).toEqual(dishes);
  });
});

describe('migrateLegacyDishes', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns success with 0 count when no legacy data exists', async () => {
    const result = await migrateLegacyDishes('hh-1', 'user-1');
    expect(result).toEqual({
      success: true,
      migratedCount: 0,
      failedCount: 0,
      failedIds: [],
      total: 0,
    });
  });

  it('migrates dishes and clears localStorage on success', async () => {
    const dishes = [
      { id: 'dish-1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'dish-2', name: 'Sushi', countryCode: 'JPN', createdAt: '2024-01-02T00:00:00Z' },
    ];
    localStorage.setItem(LEGACY_KEY, JSON.stringify(dishes));

    // Mock: no existing entries
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [] }),
      }),
    });

    // Mock: successful inserts
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {};
    });

    const onProgress = vi.fn();
    const result = await migrateLegacyDishes('hh-1', 'user-1', onProgress);

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.total).toBe(2);
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
    expect(onProgress).toHaveBeenCalled();
  });

  it('retains localStorage on partial failure', async () => {
    const dishes = [
      { id: 'dish-1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'dish-2', name: 'Sushi', countryCode: 'JPN', createdAt: '2024-01-02T00:00:00Z' },
    ];
    localStorage.setItem(LEGACY_KEY, JSON.stringify(dishes));

    // Mock: no existing entries
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [] }),
      }),
    });

    // Mock: first insert succeeds, second fails
    let callCount = 0;
    const insertMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ error: null });
      return Promise.resolve({ error: { code: '500', message: 'Server error' } });
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {};
    });

    const result = await migrateLegacyDishes('hh-1', 'user-1');

    expect(result.success).toBe(false);
    expect(result.migratedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.failedIds).toEqual(['dish-2']);
    // localStorage should be retained on failure
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('skips already-migrated entries on retry', async () => {
    const dishes = [
      { id: 'dish-1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01T00:00:00Z' },
      { id: 'dish-2', name: 'Sushi', countryCode: 'JPN', createdAt: '2024-01-02T00:00:00Z' },
    ];
    localStorage.setItem(LEGACY_KEY, JSON.stringify(dishes));

    // Mock: dish-1 already exists in DB
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [{ id: 'dish-1' }] }),
      }),
    });

    // Mock: insert succeeds for dish-2
    const insertMock = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {};
    });

    const result = await migrateLegacyDishes('hh-1', 'user-1');

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2); // 1 already migrated + 1 newly migrated
    expect(result.failedCount).toBe(0);
    // Only dish-2 should have been inserted
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dish-2', name: 'Sushi' })
    );
  });

  it('maps legacy Dish fields to DishEntry format correctly', async () => {
    const dishes = [
      { id: 'dish-1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01T00:00:00Z' },
    ];
    localStorage.setItem(LEGACY_KEY, JSON.stringify(dishes));

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [] }),
      }),
    });

    const insertMock = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return {
          select: selectMock,
          insert: insertMock,
        };
      }
      return {};
    });

    await migrateLegacyDishes('hh-1', 'user-1');

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dish-1',
        household_id: 'hh-1',
        country_code: 'THA',
        name: 'Pad Thai',
        rating: null,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
        created_at: '2024-01-01T00:00:00Z',
        created_by: 'user-1',
      })
    );
  });
});
