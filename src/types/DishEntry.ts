export interface DishEntry {
  id: string;                  // UUID (generated client-side for offline support)
  household_id: string;        // FK to households table
  country_code: string;        // ISO 3166-1 alpha-3
  name: string;                // Dish name (trimmed, 1-100 chars)
  rating: number | null;       // 1-10 inclusive, null for migrated entries
  photo_path: string | null;   // Storage path (e.g., "household-id/dish-id.jpg")
  ingredients: string[];       // Array of ingredient strings (max 50 items)
  notes: string | null;        // Free text (max 1000 chars)
  recipe_link: string | null;  // Valid URL or null
  created_at: string;          // ISO 8601 timestamp
  updated_at: string;          // ISO 8601 timestamp
  created_by: string;          // User ID who created the entry
  sync_status: SyncStatus;     // Client-only field, not persisted to DB
}

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface PopularDish {
  id: string;                  // UUID
  country_code: string;        // ISO 3166-1 alpha-3
  name: string;                // Dish name
  recipe_link: string;         // URL to recipe
  sort_order: number;          // Order within country for rotation
}

export interface Household {
  id: string;                  // UUID
  created_at: string;          // ISO 8601
  invite_code: string | null;  // Active invite code
  invite_expires_at: string | null; // Expiry timestamp
}

export interface HouseholdMember {
  id: string;                  // UUID
  household_id: string;        // FK to households
  user_id: string;             // FK to auth.users
  joined_at: string;           // ISO 8601
}
