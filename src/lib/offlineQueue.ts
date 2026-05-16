import { createStore, get, set, del, keys, entries, clear } from 'idb-keyval';
import type { QueuedMutation } from '../types/QueuedMutation';
import type { DishEntry, PopularDish } from '../types/DishEntry';

// --- IndexedDB Stores ---

const dishEntriesCacheStore = createStore('dish_entries_cache', 'entries');
const mutationQueueStore = createStore('mutation_queue', 'mutations');
const popularDishesCacheStore = createStore('popular_dishes_cache', 'dishes');

// --- Mutation Queue (FIFO) ---

/**
 * Enqueue a mutation for offline sync.
 * Mutations are stored with their ID as key and include a timestamp for FIFO ordering.
 * Photo Blobs are stored directly in the mutation's photoFile field.
 */
export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  await set(mutation.id, mutation, mutationQueueStore);
}

/**
 * Dequeue all pending mutations in FIFO order (sorted by timestamp ascending).
 * Returns mutations in the exact order they were created.
 */
export async function dequeueMutations(): Promise<QueuedMutation[]> {
  const allEntries = await entries<string, QueuedMutation>(mutationQueueStore);
  const mutations = allEntries.map(([, value]) => value);

  // Sort by timestamp ascending (earliest first) for FIFO ordering
  mutations.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return mutations;
}

/**
 * Remove a single mutation from the queue after successful sync.
 */
export async function removeMutation(id: string): Promise<void> {
  await del(id, mutationQueueStore);
}

/**
 * Update a mutation in the queue (e.g., to increment retryCount on failure).
 */
export async function updateMutation(mutation: QueuedMutation): Promise<void> {
  await set(mutation.id, mutation, mutationQueueStore);
}

/**
 * Get the number of pending mutations in the queue.
 */
export async function getQueueLength(): Promise<number> {
  const allKeys = await keys(mutationQueueStore);
  return allKeys.length;
}

/**
 * Clear all mutations from the queue.
 */
export async function clearMutationQueue(): Promise<void> {
  await clear(mutationQueueStore);
}

// --- Dish Entries Cache ---

/**
 * Cache a dish entry locally for offline access.
 */
export async function cacheDishEntry(entry: DishEntry): Promise<void> {
  await set(entry.id, entry, dishEntriesCacheStore);
}

/**
 * Cache multiple dish entries at once (e.g., on initial load).
 */
export async function cacheDishEntries(dishEntries: DishEntry[]): Promise<void> {
  for (const entry of dishEntries) {
    await set(entry.id, entry, dishEntriesCacheStore);
  }
}

/**
 * Get a single cached dish entry by ID.
 */
export async function getCachedDishEntry(id: string): Promise<DishEntry | undefined> {
  return get<DishEntry>(id, dishEntriesCacheStore);
}

/**
 * Get all cached dish entries.
 */
export async function getAllCachedDishEntries(): Promise<DishEntry[]> {
  const allEntries = await entries<string, DishEntry>(dishEntriesCacheStore);
  return allEntries.map(([, value]) => value);
}

/**
 * Remove a cached dish entry by ID.
 */
export async function removeCachedDishEntry(id: string): Promise<void> {
  await del(id, dishEntriesCacheStore);
}

/**
 * Clear all cached dish entries (e.g., on sign-out).
 */
export async function clearDishEntriesCache(): Promise<void> {
  await clear(dishEntriesCacheStore);
}

// --- Popular Dishes Cache ---

/**
 * Cache popular dishes for offline access.
 */
export async function cachePopularDishes(dishes: PopularDish[]): Promise<void> {
  for (const dish of dishes) {
    await set(dish.id, dish, popularDishesCacheStore);
  }
}

/**
 * Get all cached popular dishes.
 */
export async function getAllCachedPopularDishes(): Promise<PopularDish[]> {
  const allEntries = await entries<string, PopularDish>(popularDishesCacheStore);
  return allEntries.map(([, value]) => value);
}

/**
 * Clear all cached popular dishes (e.g., on sign-out or refresh).
 */
export async function clearPopularDishesCache(): Promise<void> {
  await clear(popularDishesCacheStore);
}

// --- Utility: Clear all offline data (used on sign-out) ---

/**
 * Clear all IndexedDB stores. Used when signing out to remove cached household data.
 */
export async function clearAllOfflineData(): Promise<void> {
  await clearMutationQueue();
  await clearDishEntriesCache();
  await clearPopularDishesCache();
}
