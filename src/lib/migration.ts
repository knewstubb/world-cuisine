import { supabase } from './supabase';
import type { Dish } from '../types/Dish';

const LEGACY_STORAGE_KEY = 'cooking-world-map-dishes';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  failedIds: string[];
  total: number;
}

/**
 * Detects whether localStorage contains legacy dish data.
 * Returns true if the key exists and contains a non-empty JSON array.
 */
export function detectLegacyData(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Parses legacy dishes from localStorage.
 * Returns an empty array if parsing fails.
 */
export function parseLegacyDishes(): Dish[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Dish[];
  } catch {
    return [];
  }
}

/**
 * Migrates legacy dishes from localStorage to Supabase.
 * Maps old Dish fields to new DishEntry format with:
 *   photo_path=null, ingredients=[], notes=null, recipe_link=null, rating=null
 *
 * On success: clears localStorage data.
 * On partial failure: returns which entries failed so retry can skip already-migrated.
 *
 * @param householdId - The household ID to associate entries with
 * @param userId - The user ID who is performing the migration
 * @param onProgress - Optional callback for progress updates
 */
export async function migrateLegacyDishes(
  householdId: string,
  userId: string,
  onProgress?: (migrated: number, total: number) => void
): Promise<MigrationResult> {
  const dishes = parseLegacyDishes();
  const total = dishes.length;

  if (total === 0) {
    return { success: true, migratedCount: 0, failedCount: 0, failedIds: [], total: 0 };
  }

  // Check which dishes are already migrated (by original ID)
  const { data: existingEntries } = await supabase
    .from('dish_entries')
    .select('id')
    .eq('household_id', householdId)
    .in('id', dishes.map((d) => d.id));

  const alreadyMigratedIds = new Set(
    (existingEntries || []).map((e) => e.id)
  );

  const toMigrate = dishes.filter((d) => !alreadyMigratedIds.has(d.id));
  let migratedCount = alreadyMigratedIds.size;
  const failedIds: string[] = [];

  for (const dish of toMigrate) {
    try {
      const now = new Date().toISOString();
      const entry = {
        id: dish.id,
        household_id: householdId,
        country_code: dish.countryCode,
        name: dish.name,
        rating: null,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
        created_at: dish.createdAt || now,
        updated_at: now,
        created_by: userId,
      };

      const { error } = await supabase.from('dish_entries').insert(entry);

      if (error) {
        // If it's a duplicate key error, treat as already migrated
        if (error.code === '23505') {
          migratedCount++;
        } else {
          failedIds.push(dish.id);
        }
      } else {
        migratedCount++;
      }
    } catch {
      failedIds.push(dish.id);
    }

    onProgress?.(migratedCount, total);
  }

  const success = failedIds.length === 0;

  if (success) {
    // Clear localStorage only on full success
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  return {
    success,
    migratedCount,
    failedCount: failedIds.length,
    failedIds,
    total,
  };
}

/**
 * Clears legacy data from localStorage.
 * Used after successful migration.
 */
export function clearLegacyData(): void {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
