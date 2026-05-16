import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSyncService } from '../useSyncService';
import {
  clearMutationQueue,
  clearDishEntriesCache,
  getQueueLength,
  getAllCachedDishEntries,
  dequeueMutations,
  enqueueMutation,
  clearPopularDishesCache,
} from '../../lib/offlineQueue';
import type { QueuedMutation } from '../../types/QueuedMutation';
import type { PopularDish } from '../../types/DishEntry';

// Mock photoUpload module
const mockUploadPhotoToStorage = vi.fn();
vi.mock('../../lib/photoUpload', () => ({
  uploadPhoto: (...args: unknown[]) => mockUploadPhotoToStorage(...args),
}));

// Mock Supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockGetSession = vi.fn().mockResolvedValue({
  data: { session: { user: { id: 'user-1' } } },
});

// Realtime channel mock
type RealtimeCallback = (payload: {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

let realtimeCallback: RealtimeCallback | null = null;
const mockUnsubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn().mockReturnValue({ unsubscribe: mockUnsubscribe });
const mockOn = vi.fn().mockImplementation((_event: string, _filter: unknown, callback: RealtimeCallback) => {
  realtimeCallback = callback;
  return { subscribe: mockSubscribe };
});
const mockChannel = vi.fn().mockReturnValue({ on: mockOn, subscribe: mockSubscribe });

// Configurable mock data for popular_dishes query
let mockPopularDishesResponse: { data: PopularDish[] | null } = { data: [] };

const mockFrom = vi.fn((table: string) => {
  if (table === 'household_members') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { household_id: 'household-1' } }),
        }),
      }),
    };
  }
  if (table === 'popular_dishes') {
    return {
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue(mockPopularDishesResponse),
      }),
    };
  }
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [] }),
      }),
    }),
    insert: mockInsert,
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

/**
 * Helper to wait for the hook's async initialization to complete.
 * The hook fetches session + household membership on mount, then
 * fetches dish_entries and popular_dishes from Supabase. Multiple
 * sequential awaits require several event-loop ticks to fully resolve.
 */
async function waitForInit() {
  // Allow multiple microtask/macrotask cycles for the init() async function to fully resolve
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('useSyncService', () => {
  beforeEach(async () => {
    // Ensure online state is reset before each test
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    await clearMutationQueue();
    await clearDishEntriesCache();
    await clearPopularDishesCache();
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockUploadPhotoToStorage.mockResolvedValue('household-1/dish-id.jpg');
    mockPopularDishesResponse = { data: [] };
    realtimeCallback = null;
    // Re-setup the channel mock chain after clearAllMocks
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe });
    mockOn.mockImplementation((_event: string, _filter: unknown, callback: RealtimeCallback) => {
      realtimeCallback = callback;
      return { subscribe: mockSubscribe };
    });
    mockSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });
  });

  afterEach(() => {
    // Restore online state after each test
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('should initialize with online status and zero pending count', async () => {
    const { result } = renderHook(() => useSyncService());

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.pendingCount).toBe(0);
    });
  });

  it('should return empty dish entries for a country initially', async () => {
    const { result } = renderHook(() => useSyncService());

    await waitFor(() => {
      const entries = result.current.getDishEntriesForCountry('JPN');
      expect(entries).toEqual([]);
    });
  });

  it('should return empty set for countries with dishes initially', async () => {
    const { result } = renderHook(() => useSyncService());

    await waitFor(() => {
      const countries = result.current.getCountriesWithDishes();
      expect(countries.size).toBe(0);
    });
  });

  it('should add a dish entry optimistically and cache it', async () => {
    const { result } = renderHook(() => useSyncService());

    // Wait for async initialization (session + household fetch)
    await waitForInit();

    let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
    await act(async () => {
      addedEntry = await result.current.addDishEntry({
        country_code: 'JPN',
        name: 'Sushi',
        rating: 9,
        photo_path: null,
        ingredients: ['rice', 'fish'],
        notes: 'Delicious',
        recipe_link: null,
      });
    });

    expect(addedEntry).toBeDefined();
    expect(addedEntry!.name).toBe('Sushi');
    expect(addedEntry!.country_code).toBe('JPN');
    expect(addedEntry!.rating).toBe(9);
    expect(addedEntry!.id).toBeDefined();
    expect(addedEntry!.household_id).toBe('household-1');
    expect(addedEntry!.created_by).toBe('user-1');

    // Verify it appears in local state
    const entries = result.current.getDishEntriesForCountry('JPN');
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Sushi');

    // Verify it's in the IndexedDB cache
    const cached = await getAllCachedDishEntries();
    expect(cached).toHaveLength(1);
    expect(cached[0].name).toBe('Sushi');
  });

  it('should update getCountriesWithDishes after adding an entry', async () => {
    const { result } = renderHook(() => useSyncService());

    await waitForInit();

    await act(async () => {
      await result.current.addDishEntry({
        country_code: 'ITA',
        name: 'Pizza',
        rating: 10,
        photo_path: null,
        ingredients: ['dough', 'tomato', 'cheese'],
        notes: null,
        recipe_link: null,
      });
    });

    const countries = result.current.getCountriesWithDishes();
    expect(countries.has('ITA')).toBe(true);
  });

  it('should delete a dish entry optimistically', async () => {
    const { result } = renderHook(() => useSyncService());

    await waitForInit();

    let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
    await act(async () => {
      addedEntry = await result.current.addDishEntry({
        country_code: 'JPN',
        name: 'Ramen',
        rating: 8,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
      });
    });

    expect(result.current.getDishEntriesForCountry('JPN')).toHaveLength(1);

    await act(async () => {
      await result.current.deleteDishEntry(addedEntry!.id);
    });

    expect(result.current.getDishEntriesForCountry('JPN')).toHaveLength(0);

    // Verify removed from IndexedDB cache
    const cached = await getAllCachedDishEntries();
    expect(cached).toHaveLength(0);
  });

  it('should queue mutations when offline', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    window.dispatchEvent(new Event('offline'));

    const { result } = renderHook(() => useSyncService());

    await waitForInit();

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    await act(async () => {
      await result.current.addDishEntry({
        country_code: 'FRA',
        name: 'Croissant',
        rating: 7,
        photo_path: null,
        ingredients: ['butter', 'flour'],
        notes: null,
        recipe_link: null,
      });
    });

    // Should have queued a mutation
    const queueLen = await getQueueLength();
    expect(queueLen).toBe(1);

    // Pending count should reflect the queue
    expect(result.current.pendingCount).toBe(1);

    // Entry should still be in local state with pending status
    const entries = result.current.getDishEntriesForCountry('FRA');
    expect(entries).toHaveLength(1);
    expect(entries[0].sync_status).toBe('pending');

    // Restore online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    window.dispatchEvent(new Event('online'));
  });

  it('should queue delete mutations when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    window.dispatchEvent(new Event('offline'));

    const { result } = renderHook(() => useSyncService());

    await waitForInit();

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    // Add an entry first
    let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
    await act(async () => {
      addedEntry = await result.current.addDishEntry({
        country_code: 'MEX',
        name: 'Tacos',
        rating: 9,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
      });
    });

    // Delete it
    await act(async () => {
      await result.current.deleteDishEntry(addedEntry!.id);
    });

    // Should have 2 queued mutations (INSERT + DELETE)
    const mutations = await dequeueMutations();
    expect(mutations).toHaveLength(2);
    const types = mutations.map((m) => m.type);
    expect(types).toContain('INSERT');
    expect(types).toContain('DELETE');

    // Restore online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
    window.dispatchEvent(new Event('online'));
  });

  it('should queue mutation when online insert fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'Network error' } });

    const { result } = renderHook(() => useSyncService());

    await waitForInit();

    await act(async () => {
      await result.current.addDishEntry({
        country_code: 'THA',
        name: 'Pad Thai',
        rating: 8,
        photo_path: null,
        ingredients: ['noodles', 'shrimp'],
        notes: null,
        recipe_link: null,
      });
    });

    // Should have queued the failed mutation
    const queueLen = await getQueueLength();
    expect(queueLen).toBe(1);

    // Entry should still be in local state with pending status
    const entries = result.current.getDishEntriesForCountry('THA');
    expect(entries).toHaveLength(1);
    expect(entries[0].sync_status).toBe('pending');
  });

  describe('Realtime subscriptions', () => {
    it('should subscribe to realtime channel after initialization', async () => {
      const { result: _result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for the householdId state to trigger the subscription effect
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(mockChannel).toHaveBeenCalledWith('dish_entries:household_id=eq.household-1');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'dish_entries',
          filter: 'household_id=eq.household-1',
        }),
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should handle INSERT events from realtime and add new entries', async () => {
      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for subscription to be set up
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Simulate an INSERT event from another device
      const newEntry = {
        id: 'remote-dish-1',
        household_id: 'household-1',
        country_code: 'ITA',
        name: 'Risotto',
        rating: 8,
        photo_path: null,
        ingredients: ['rice', 'broth'],
        notes: 'Creamy',
        recipe_link: null,
        created_at: '2024-06-01T12:00:00.000Z',
        updated_at: '2024-06-01T12:00:00.000Z',
        created_by: 'user-2',
      };

      await act(async () => {
        realtimeCallback!({
          eventType: 'INSERT',
          new: newEntry,
          old: {},
        });
        await new Promise((r) => setTimeout(r, 10));
      });

      const entries = result.current.getDishEntriesForCountry('ITA');
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe('Risotto');
      expect(entries[0].sync_status).toBe('synced');

      // Verify it's cached in IndexedDB
      const cached = await getAllCachedDishEntries();
      const cachedEntry = cached.find((e) => e.id === 'remote-dish-1');
      expect(cachedEntry).toBeDefined();
      expect(cachedEntry!.name).toBe('Risotto');
    });

    it('should not duplicate entries on INSERT if already present from optimistic update', async () => {
      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for subscription to be set up
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Add an entry locally (optimistic)
      let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
      await act(async () => {
        addedEntry = await result.current.addDishEntry({
          country_code: 'FRA',
          name: 'Bouillabaisse',
          rating: 9,
          photo_path: null,
          ingredients: ['fish', 'saffron'],
          notes: null,
          recipe_link: null,
        });
      });

      // Simulate the same entry coming back via realtime
      await act(async () => {
        realtimeCallback!({
          eventType: 'INSERT',
          new: {
            id: addedEntry!.id,
            household_id: 'household-1',
            country_code: 'FRA',
            name: 'Bouillabaisse',
            rating: 9,
            photo_path: null,
            ingredients: ['fish', 'saffron'],
            notes: null,
            recipe_link: null,
            created_at: addedEntry!.created_at,
            updated_at: addedEntry!.updated_at,
            created_by: 'user-1',
          },
          old: {},
        });
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should still only have one entry, not duplicated
      const entries = result.current.getDishEntriesForCountry('FRA');
      expect(entries).toHaveLength(1);
      expect(entries[0].sync_status).toBe('synced');
    });

    it('should handle UPDATE events with last-write-wins conflict resolution', async () => {
      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for subscription to be set up
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Add an entry locally
      let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
      await act(async () => {
        addedEntry = await result.current.addDishEntry({
          country_code: 'JPN',
          name: 'Ramen',
          rating: 7,
          photo_path: null,
          ingredients: ['noodles'],
          notes: null,
          recipe_link: null,
        });
      });

      // Simulate an UPDATE event with a NEWER timestamp (should win)
      const newerTimestamp = new Date(Date.now() + 10000).toISOString();
      await act(async () => {
        realtimeCallback!({
          eventType: 'UPDATE',
          new: {
            id: addedEntry!.id,
            household_id: 'household-1',
            country_code: 'JPN',
            name: 'Ramen',
            rating: 10,
            photo_path: null,
            ingredients: ['noodles', 'pork'],
            notes: 'Updated by partner',
            recipe_link: null,
            created_at: addedEntry!.created_at,
            updated_at: newerTimestamp,
            created_by: 'user-2',
          },
          old: {},
        });
        await new Promise((r) => setTimeout(r, 10));
      });

      // The update should have been applied (newer timestamp wins)
      const entries = result.current.getDishEntriesForCountry('JPN');
      expect(entries).toHaveLength(1);
      expect(entries[0].rating).toBe(10);
      expect(entries[0].notes).toBe('Updated by partner');
      expect(entries[0].ingredients).toEqual(['noodles', 'pork']);
    });

    it('should reject UPDATE events with older timestamps (last-write-wins)', async () => {
      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for subscription to be set up
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Add an entry locally with a recent timestamp
      let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
      await act(async () => {
        addedEntry = await result.current.addDishEntry({
          country_code: 'KOR',
          name: 'Kimchi',
          rating: 8,
          photo_path: null,
          ingredients: ['cabbage'],
          notes: 'Local edit',
          recipe_link: null,
        });
      });

      // Simulate an UPDATE event with an OLDER timestamp (should be rejected)
      const olderTimestamp = new Date(Date.now() - 60000).toISOString();
      await act(async () => {
        realtimeCallback!({
          eventType: 'UPDATE',
          new: {
            id: addedEntry!.id,
            household_id: 'household-1',
            country_code: 'KOR',
            name: 'Kimchi',
            rating: 5,
            photo_path: null,
            ingredients: ['cabbage', 'chili'],
            notes: 'Stale remote edit',
            recipe_link: null,
            created_at: addedEntry!.created_at,
            updated_at: olderTimestamp,
            created_by: 'user-2',
          },
          old: {},
        });
        await new Promise((r) => setTimeout(r, 10));
      });

      // The local version should be preserved (newer timestamp)
      const entries = result.current.getDishEntriesForCountry('KOR');
      expect(entries).toHaveLength(1);
      expect(entries[0].rating).toBe(8);
      expect(entries[0].notes).toBe('Local edit');
      expect(entries[0].ingredients).toEqual(['cabbage']);
    });

    it('should handle DELETE events from realtime', async () => {
      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for subscription to be set up
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      // Add an entry locally
      let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
      await act(async () => {
        addedEntry = await result.current.addDishEntry({
          country_code: 'MEX',
          name: 'Enchiladas',
          rating: 7,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
        });
      });

      expect(result.current.getDishEntriesForCountry('MEX')).toHaveLength(1);

      // Simulate a DELETE event from another device
      await act(async () => {
        realtimeCallback!({
          eventType: 'DELETE',
          new: {},
          old: { id: addedEntry!.id },
        });
        await new Promise((r) => setTimeout(r, 10));
      });

      // Entry should be removed
      expect(result.current.getDishEntriesForCountry('MEX')).toHaveLength(0);

      // Verify removed from IndexedDB cache
      const cached = await getAllCachedDishEntries();
      const found = cached.find((e) => e.id === addedEntry!.id);
      expect(found).toBeUndefined();
    });

    it('should unsubscribe from realtime channel on unmount', async () => {
      const { unmount } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for subscription to be set up
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      unmount();

      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });

  it('should increment retryCount on sync failure and keep mutation in queue', async () => {
    // Start offline so we can queue a mutation
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    // Pre-seed a mutation in the queue with retryCount 0
    const mutation: QueuedMutation = {
      id: 'test-mutation-1',
      type: 'INSERT',
      table: 'dish_entries',
      payload: {
        id: 'dish-1',
        household_id: 'household-1',
        country_code: 'JPN',
        name: 'Sushi',
        rating: 9,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user-1',
      },
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    await enqueueMutation(mutation);

    // Make insert throw to simulate network failure during replay
    mockInsert.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSyncService());
    await waitForInit();

    // Go online to trigger replay
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    // Allow replay to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Mutation should still be in the queue
    const queueLen = await getQueueLength();
    expect(queueLen).toBe(1);

    // retryCount should have been incremented
    const mutations = await dequeueMutations();
    expect(mutations).toHaveLength(1);
    expect(mutations[0].retryCount).toBe(1);
    expect(mutations[0].id).toBe('test-mutation-1');

    // pendingCount should reflect the remaining mutation
    expect(result.current.pendingCount).toBe(1);
  });

  it('should retry failed mutations on next connectivity change', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    // Pre-seed a mutation with retryCount 1 (already failed once)
    const mutation: QueuedMutation = {
      id: 'test-mutation-retry',
      type: 'INSERT',
      table: 'dish_entries',
      payload: {
        id: 'dish-retry',
        household_id: 'household-1',
        country_code: 'KOR',
        name: 'Bibimbap',
        rating: 8,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user-1',
      },
      timestamp: new Date().toISOString(),
      retryCount: 1,
    };
    await enqueueMutation(mutation);

    // First online event: make it fail again
    mockInsert.mockRejectedValueOnce(new Error('Still failing'));

    const { result } = renderHook(() => useSyncService());
    await waitForInit();

    // First online event
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Should still be in queue with retryCount incremented to 2
    let mutations = await dequeueMutations();
    expect(mutations).toHaveLength(1);
    expect(mutations[0].retryCount).toBe(2);

    // Now make the next attempt succeed
    mockInsert.mockResolvedValueOnce({ error: null });

    // Simulate going offline then online again
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Now the mutation should have been removed from the queue
    mutations = await dequeueMutations();
    expect(mutations).toHaveLength(0);

    // pendingCount should be 0
    expect(result.current.pendingCount).toBe(0);
  });

  it('should continue processing remaining mutations after one fails', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    // Pre-seed two mutations
    const mutation1: QueuedMutation = {
      id: 'mutation-fail',
      type: 'INSERT',
      table: 'dish_entries',
      payload: {
        id: 'dish-fail',
        household_id: 'household-1',
        country_code: 'JPN',
        name: 'Tempura',
        rating: 7,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        created_by: 'user-1',
      },
      timestamp: '2024-01-01T00:00:00.000Z',
      retryCount: 0,
    };
    const mutation2: QueuedMutation = {
      id: 'mutation-success',
      type: 'INSERT',
      table: 'dish_entries',
      payload: {
        id: 'dish-success',
        household_id: 'household-1',
        country_code: 'JPN',
        name: 'Udon',
        rating: 8,
        photo_path: null,
        ingredients: [],
        notes: null,
        recipe_link: null,
        created_at: '2024-01-01T00:00:01.000Z',
        updated_at: '2024-01-01T00:00:01.000Z',
        created_by: 'user-1',
      },
      timestamp: '2024-01-01T00:00:01.000Z',
      retryCount: 0,
    };
    await enqueueMutation(mutation1);
    await enqueueMutation(mutation2);

    // First insert fails, second succeeds
    mockInsert
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useSyncService());
    await waitForInit();

    // Go online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Only the failed mutation should remain in the queue
    const mutations = await dequeueMutations();
    expect(mutations).toHaveLength(1);
    expect(mutations[0].id).toBe('mutation-fail');
    expect(mutations[0].retryCount).toBe(1);

    // pendingCount should be 1
    expect(result.current.pendingCount).toBe(1);
  });

  describe('Suggestion rotation integration', () => {
    const testPopularDishes: PopularDish[] = [
      { id: 'pd-1', country_code: 'JPN', name: 'Sushi', recipe_link: 'https://example.com/sushi', sort_order: 1 },
      { id: 'pd-2', country_code: 'JPN', name: 'Ramen', recipe_link: 'https://example.com/ramen', sort_order: 2 },
      { id: 'pd-3', country_code: 'JPN', name: 'Tempura', recipe_link: 'https://example.com/tempura', sort_order: 3 },
      { id: 'pd-4', country_code: 'JPN', name: 'Udon', recipe_link: 'https://example.com/udon', sort_order: 4 },
      { id: 'pd-5', country_code: 'ITA', name: 'Pizza', recipe_link: 'https://example.com/pizza', sort_order: 1 },
    ];

    it('should return suggestions from cached popular dishes', async () => {
      // Set mock to return popular dishes from Supabase
      mockPopularDishesResponse = { data: testPopularDishes };

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for popular dishes state to update
      await waitFor(() => {
        const suggestions = result.current.getSuggestionsForCountry('JPN');
        expect(suggestions).toHaveLength(3);
      });

      const suggestions = result.current.getSuggestionsForCountry('JPN');
      expect(suggestions[0].name).toBe('Sushi');
      expect(suggestions[1].name).toBe('Ramen');
      expect(suggestions[2].name).toBe('Tempura');
    });

    it('should filter out cooked dishes from suggestions when a dish is added', async () => {
      // Set mock to return popular dishes from Supabase
      mockPopularDishesResponse = { data: testPopularDishes };

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for popular dishes state to update
      await waitFor(() => {
        const suggestions = result.current.getSuggestionsForCountry('JPN');
        expect(suggestions).toHaveLength(3);
      });

      // Add a dish that matches a popular dish name
      await act(async () => {
        await result.current.addDishEntry({
          country_code: 'JPN',
          name: 'Sushi',
          rating: 9,
          photo_path: null,
          ingredients: ['rice', 'fish'],
          notes: null,
          recipe_link: null,
        });
      });

      // Suggestions should now exclude "Sushi" and include "Udon" as the 3rd
      const suggestions = result.current.getSuggestionsForCountry('JPN');
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].name).toBe('Ramen');
      expect(suggestions[1].name).toBe('Tempura');
      expect(suggestions[2].name).toBe('Udon');
    });

    it('should NOT restore suggestion when a dish is deleted (Req 5.5)', async () => {
      // Set mock to return popular dishes from Supabase
      mockPopularDishesResponse = { data: testPopularDishes };

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for popular dishes state to update
      await waitFor(() => {
        const suggestions = result.current.getSuggestionsForCountry('JPN');
        expect(suggestions).toHaveLength(3);
      });

      // Add a dish matching a popular dish
      let addedEntry: Awaited<ReturnType<typeof result.current.addDishEntry>> | undefined;
      await act(async () => {
        addedEntry = await result.current.addDishEntry({
          country_code: 'JPN',
          name: 'Sushi',
          rating: 9,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
        });
      });

      // Verify Sushi is excluded from suggestions
      let suggestions = result.current.getSuggestionsForCountry('JPN');
      expect(suggestions.some((s) => s.name === 'Sushi')).toBe(false);

      // Delete the dish
      await act(async () => {
        await result.current.deleteDishEntry(addedEntry!.id);
      });

      // Sushi should still NOT reappear in suggestions (everCookedNames persists)
      suggestions = result.current.getSuggestionsForCountry('JPN');
      expect(suggestions.some((s) => s.name === 'Sushi')).toBe(false);
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0].name).toBe('Ramen');
      expect(suggestions[1].name).toBe('Tempura');
      expect(suggestions[2].name).toBe('Udon');
    });

    it('should use case-insensitive trimmed matching for suggestion filtering', async () => {
      // Set mock to return popular dishes from Supabase
      mockPopularDishesResponse = { data: testPopularDishes };

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for popular dishes state to update
      await waitFor(() => {
        const suggestions = result.current.getSuggestionsForCountry('JPN');
        expect(suggestions).toHaveLength(3);
      });

      // Add a dish with different casing and whitespace
      await act(async () => {
        await result.current.addDishEntry({
          country_code: 'JPN',
          name: '  SUSHI  ',
          rating: 8,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
        });
      });

      // "Sushi" should be excluded from suggestions (case-insensitive trimmed match)
      const suggestions = result.current.getSuggestionsForCountry('JPN');
      expect(suggestions.some((s) => s.name === 'Sushi')).toBe(false);
    });

    it('should return empty suggestions for a country with no popular dishes', async () => {
      // Set mock to return popular dishes from Supabase
      mockPopularDishesResponse = { data: testPopularDishes };

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for popular dishes state to update
      await waitFor(() => {
        const suggestions = result.current.getSuggestionsForCountry('JPN');
        expect(suggestions).toHaveLength(3);
      });

      const suggestions = result.current.getSuggestionsForCountry('BRA');
      expect(suggestions).toHaveLength(0);
    });

    it('should return only country-specific suggestions', async () => {
      // Set mock to return popular dishes from Supabase
      mockPopularDishesResponse = { data: testPopularDishes };

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Wait for popular dishes state to update
      await waitFor(() => {
        const suggestions = result.current.getSuggestionsForCountry('ITA');
        expect(suggestions).toHaveLength(1);
      });

      const suggestions = result.current.getSuggestionsForCountry('ITA');
      expect(suggestions[0].name).toBe('Pizza');
    });
  });

  describe('Offline photo queuing (Req 9.6, 9.7)', () => {
    it('should store photoFile Blob in queued mutation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
      window.dispatchEvent(new Event('offline'));

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      const photoFile = new File(['photo-data'], 'dish.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.addDishEntry(
          {
            country_code: 'JPN',
            name: 'Sushi',
            rating: 9,
            photo_path: null,
            ingredients: [],
            notes: null,
            recipe_link: null,
          },
          photoFile,
        );
      });

      // Verify the mutation was queued with the photo Blob
      const mutations = await dequeueMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].type).toBe('INSERT');
      expect(mutations[0].photoFile).toBeDefined();
      // In fake-indexeddb, File/Blob may lose prototype but data is preserved
      expect(mutations[0].photoFile).not.toBeUndefined();

      // Restore online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });

    it('should upload queued photo before inserting dish_entry on reconnect', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

      // Pre-seed a mutation with a photoFile Blob
      const photoBlob = new Blob(['photo-data'], { type: 'image/jpeg' });
      const mutation: QueuedMutation = {
        id: 'photo-mutation-1',
        type: 'INSERT',
        table: 'dish_entries',
        payload: {
          id: 'dish-photo-1',
          household_id: 'household-1',
          country_code: 'JPN',
          name: 'Sushi with Photo',
          rating: 9,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'user-1',
          sync_status: 'pending',
        },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        photoFile: photoBlob,
      };
      await enqueueMutation(mutation);

      // Mock photo upload to return a path
      mockUploadPhotoToStorage.mockResolvedValueOnce('household-1/dish-photo-1.jpg');

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Go online to trigger replay
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Photo upload should have been called
      expect(mockUploadPhotoToStorage).toHaveBeenCalledTimes(1);
      expect(mockUploadPhotoToStorage).toHaveBeenCalledWith(
        expect.any(File),
        'household-1',
        'dish-photo-1',
      );

      // The insert should have been called with the photo_path
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dish-photo-1',
          photo_path: 'household-1/dish-photo-1.jpg',
        }),
      );

      // Queue should be empty
      const queueLen = await getQueueLength();
      expect(queueLen).toBe(0);

      // pendingCount should be 0
      expect(result.current.pendingCount).toBe(0);
    });

    it('should keep mutation in queue with incremented retryCount when photo upload fails', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

      // Pre-seed a mutation with a photoFile Blob
      const photoBlob = new Blob(['photo-data'], { type: 'image/png' });
      const mutation: QueuedMutation = {
        id: 'photo-mutation-fail',
        type: 'INSERT',
        table: 'dish_entries',
        payload: {
          id: 'dish-photo-fail',
          household_id: 'household-1',
          country_code: 'ITA',
          name: 'Pizza with Photo',
          rating: 10,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'user-1',
          sync_status: 'pending',
        },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        photoFile: photoBlob,
      };
      await enqueueMutation(mutation);

      // Mock photo upload to fail
      mockUploadPhotoToStorage.mockRejectedValueOnce(new Error('Upload failed'));

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Go online to trigger replay
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // The insert should NOT have been called (photo upload failed first)
      expect(mockInsert).not.toHaveBeenCalled();

      // Mutation should still be in the queue with incremented retryCount
      const mutations = await dequeueMutations();
      expect(mutations).toHaveLength(1);
      expect(mutations[0].id).toBe('photo-mutation-fail');
      expect(mutations[0].retryCount).toBe(1);
      expect(mutations[0].photoFile).toBeDefined();

      // pendingCount should be 1
      expect(result.current.pendingCount).toBe(1);
    });

    it('should not attempt photo upload for mutations without photoFile', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

      // Pre-seed a mutation WITHOUT a photoFile
      const mutation: QueuedMutation = {
        id: 'no-photo-mutation',
        type: 'INSERT',
        table: 'dish_entries',
        payload: {
          id: 'dish-no-photo',
          household_id: 'household-1',
          country_code: 'FRA',
          name: 'Croissant',
          rating: 7,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'user-1',
          sync_status: 'pending',
        },
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      await enqueueMutation(mutation);

      const { result } = renderHook(() => useSyncService());
      await waitForInit();

      // Go online to trigger replay
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
        window.dispatchEvent(new Event('online'));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // Photo upload should NOT have been called
      expect(mockUploadPhotoToStorage).not.toHaveBeenCalled();

      // The insert should have been called normally
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dish-no-photo',
          name: 'Croissant',
        }),
      );

      // Queue should be empty
      const queueLen = await getQueueLength();
      expect(queueLen).toBe(0);
      expect(result.current.pendingCount).toBe(0);
    });
  });
});
