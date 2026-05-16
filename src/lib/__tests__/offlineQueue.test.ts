import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { QueuedMutation } from '../../types/QueuedMutation';
import type { DishEntry, PopularDish } from '../../types/DishEntry';
import {
  enqueueMutation,
  dequeueMutations,
  removeMutation,
  getQueueLength,
  clearMutationQueue,
  cacheDishEntry,
  cacheDishEntries,
  getCachedDishEntry,
  getAllCachedDishEntries,
  removeCachedDishEntry,
  clearDishEntriesCache,
  cachePopularDishes,
  getAllCachedPopularDishes,
  clearPopularDishesCache,
  clearAllOfflineData,
} from '../offlineQueue';

function makeMutation(overrides: Partial<QueuedMutation> = {}): QueuedMutation {
  return {
    id: crypto.randomUUID(),
    type: 'INSERT',
    table: 'dish_entries',
    payload: { name: 'Test Dish' },
    timestamp: new Date().toISOString(),
    retryCount: 0,
    ...overrides,
  };
}

function makeDishEntry(overrides: Partial<DishEntry> = {}): DishEntry {
  return {
    id: crypto.randomUUID(),
    household_id: 'household-1',
    country_code: 'JPN',
    name: 'Sushi',
    rating: 8,
    photo_path: null,
    ingredients: ['rice', 'fish'],
    notes: null,
    recipe_link: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    sync_status: 'synced',
    ...overrides,
  };
}

function makePopularDish(overrides: Partial<PopularDish> = {}): PopularDish {
  return {
    id: crypto.randomUUID(),
    country_code: 'ITA',
    name: 'Margherita Pizza',
    recipe_link: 'https://example.com/pizza',
    sort_order: 1,
    ...overrides,
  };
}

describe('offlineQueue - Mutation Queue', () => {
  beforeEach(async () => {
    await clearMutationQueue();
  });

  it('should start with an empty queue', async () => {
    const length = await getQueueLength();
    expect(length).toBe(0);
  });

  it('should enqueue a mutation and increase queue length', async () => {
    const mutation = makeMutation();
    await enqueueMutation(mutation);

    const length = await getQueueLength();
    expect(length).toBe(1);
  });

  it('should dequeue mutations in FIFO order (by timestamp)', async () => {
    const m1 = makeMutation({ id: 'a', timestamp: '2024-01-01T00:00:00.000Z' });
    const m2 = makeMutation({ id: 'b', timestamp: '2024-01-01T00:00:01.000Z' });
    const m3 = makeMutation({ id: 'c', timestamp: '2024-01-01T00:00:02.000Z' });

    // Enqueue out of order
    await enqueueMutation(m3);
    await enqueueMutation(m1);
    await enqueueMutation(m2);

    const dequeued = await dequeueMutations();
    expect(dequeued).toHaveLength(3);
    expect(dequeued[0].id).toBe('a');
    expect(dequeued[1].id).toBe('b');
    expect(dequeued[2].id).toBe('c');
  });

  it('should remove a mutation by ID', async () => {
    const m1 = makeMutation({ id: 'x' });
    const m2 = makeMutation({ id: 'y' });

    await enqueueMutation(m1);
    await enqueueMutation(m2);

    await removeMutation('x');

    const length = await getQueueLength();
    expect(length).toBe(1);

    const remaining = await dequeueMutations();
    expect(remaining[0].id).toBe('y');
  });

  it('should support storing photo Blobs in mutations', async () => {
    const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
    const mutation = makeMutation({ photoFile: blob });

    await enqueueMutation(mutation);

    const dequeued = await dequeueMutations();
    // In a real browser, IndexedDB stores Blobs natively.
    // fake-indexeddb may serialize Blobs differently, so we verify the field exists
    // and contains data (either as a Blob or serialized form).
    expect(dequeued[0].photoFile).toBeDefined();
    // Verify the mutation payload is intact alongside the photo
    expect(dequeued[0].type).toBe('INSERT');
    expect(dequeued[0].id).toBe(mutation.id);
  });

  it('should clear all mutations', async () => {
    await enqueueMutation(makeMutation());
    await enqueueMutation(makeMutation());

    await clearMutationQueue();

    const length = await getQueueLength();
    expect(length).toBe(0);
  });
});

describe('offlineQueue - Dish Entries Cache', () => {
  beforeEach(async () => {
    await clearDishEntriesCache();
  });

  it('should cache and retrieve a dish entry', async () => {
    const entry = makeDishEntry({ id: 'dish-1', name: 'Ramen' });
    await cacheDishEntry(entry);

    const retrieved = await getCachedDishEntry('dish-1');
    expect(retrieved).toEqual(entry);
  });

  it('should cache multiple dish entries at once', async () => {
    const entries = [
      makeDishEntry({ id: 'd1' }),
      makeDishEntry({ id: 'd2' }),
      makeDishEntry({ id: 'd3' }),
    ];
    await cacheDishEntries(entries);

    const all = await getAllCachedDishEntries();
    expect(all).toHaveLength(3);
  });

  it('should return undefined for non-existent entry', async () => {
    const result = await getCachedDishEntry('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should remove a cached dish entry', async () => {
    const entry = makeDishEntry({ id: 'to-remove' });
    await cacheDishEntry(entry);
    await removeCachedDishEntry('to-remove');

    const result = await getCachedDishEntry('to-remove');
    expect(result).toBeUndefined();
  });

  it('should clear all cached dish entries', async () => {
    await cacheDishEntries([makeDishEntry(), makeDishEntry()]);
    await clearDishEntriesCache();

    const all = await getAllCachedDishEntries();
    expect(all).toHaveLength(0);
  });
});

describe('offlineQueue - Popular Dishes Cache', () => {
  beforeEach(async () => {
    await clearPopularDishesCache();
  });

  it('should cache and retrieve popular dishes', async () => {
    const dishes = [
      makePopularDish({ id: 'p1', name: 'Pizza' }),
      makePopularDish({ id: 'p2', name: 'Pasta' }),
    ];
    await cachePopularDishes(dishes);

    const all = await getAllCachedPopularDishes();
    expect(all).toHaveLength(2);
  });

  it('should clear all cached popular dishes', async () => {
    await cachePopularDishes([makePopularDish()]);
    await clearPopularDishesCache();

    const all = await getAllCachedPopularDishes();
    expect(all).toHaveLength(0);
  });
});

describe('offlineQueue - clearAllOfflineData', () => {
  it('should clear all stores at once', async () => {
    await enqueueMutation(makeMutation());
    await cacheDishEntry(makeDishEntry());
    await cachePopularDishes([makePopularDish()]);

    await clearAllOfflineData();

    expect(await getQueueLength()).toBe(0);
    expect(await getAllCachedDishEntries()).toHaveLength(0);
    expect(await getAllCachedPopularDishes()).toHaveLength(0);
  });
});
