import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { DishEntry, PopularDish } from '../types/DishEntry';
import type { QueuedMutation } from '../types/QueuedMutation';
import {
  enqueueMutation,
  dequeueMutations,
  removeMutation,
  updateMutation,
  getQueueLength,
  cacheDishEntry,
  cacheDishEntries,
  getCachedDishEntry,
  removeCachedDishEntry,
  getAllCachedDishEntries,
  cachePopularDishes,
  getAllCachedPopularDishes,
} from '../lib/offlineQueue';
import { uploadPhoto as uploadPhotoToStorage } from '../lib/photoUpload';
import { getUncookedSuggestions } from '../lib/suggestions';

export interface SyncServiceValue {
  isOnline: boolean;
  pendingCount: number;
  addDishEntry: (
    entry: Omit<DishEntry, 'id' | 'household_id' | 'created_at' | 'updated_at' | 'created_by' | 'sync_status'>,
    photoFile?: File
  ) => Promise<DishEntry>;
  deleteDishEntry: (id: string) => Promise<void>;
  getDishEntriesForCountry: (countryCode: string) => DishEntry[];
  getCountriesWithDishes: () => Set<string>;
  getSuggestionsForCountry: (countryCode: string) => PopularDish[];
  uploadPhoto: (file: File) => Promise<string>;
}

export function useSyncService(): SyncServiceValue {
  const [dishEntries, setDishEntries] = useState<DishEntry[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [popularDishes, setPopularDishes] = useState<PopularDish[]>([]);
  // Track dish names that have ever been cooked (survives deletions per Req 5.5)
  const [everCookedNames, setEverCookedNames] = useState<Set<string>>(new Set());
  const householdIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Load cached entries and session info on mount
  useEffect(() => {
    async function init() {
      // Load cached dish entries from IndexedDB
      const cached = await getAllCachedDishEntries();
      setDishEntries(cached);

      // Initialize everCookedNames from cached entries
      const cookedSet = new Set(cached.map((e) => e.name.trim().toLowerCase()));
      setEverCookedNames(cookedSet);

      // Load cached popular dishes from IndexedDB
      const cachedPopular = await getAllCachedPopularDishes();
      if (cachedPopular.length > 0) {
        setPopularDishes(cachedPopular);
      }

      // Get pending count
      const count = await getQueueLength();
      setPendingCount(count);

      // Get current session for household_id and user_id
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userIdRef.current = session.user.id;
        // Fetch household_id for the user
        const { data: membership } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', session.user.id)
          .single();
        if (membership) {
          householdIdRef.current = membership.household_id;
          setHouseholdId(membership.household_id);
          // Load fresh data from Supabase if online
          if (navigator.onLine) {
            const { data: entries } = await supabase
              .from('dish_entries')
              .select('*')
              .eq('household_id', membership.household_id)
              .order('created_at', { ascending: false });
            if (entries) {
              const mapped: DishEntry[] = entries.map((e) => ({
                ...e,
                ingredients: e.ingredients || [],
                sync_status: 'synced' as const,
              }));
              setDishEntries(mapped);
              await cacheDishEntries(mapped);

              // Update everCookedNames from all DB entries (includes historical)
              const freshCookedSet = new Set(mapped.map((e) => e.name.trim().toLowerCase()));
              setEverCookedNames(freshCookedSet);
            }

            // Load popular dishes from Supabase
            const { data: popular } = await supabase
              .from('popular_dishes')
              .select('*')
              .order('sort_order', { ascending: true });
            if (popular) {
              const mappedPopular: PopularDish[] = popular.map((p) => ({
                id: p.id,
                country_code: p.country_code,
                name: p.name,
                recipe_link: p.recipe_link,
                sort_order: p.sort_order,
              }));
              setPopularDishes(mappedPopular);
              await cachePopularDishes(mappedPopular);
            }
          }
        }
      }
    }
    init();
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to Supabase Realtime for dish_entries changes
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`dish_entries:household_id=eq.${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dish_entries',
          filter: `household_id=eq.${householdId}`,
        },
        async (payload) => {
          const eventType = payload.eventType;

          if (eventType === 'INSERT') {
            const newRecord = payload.new as Record<string, unknown>;
            const entry: DishEntry = {
              ...(newRecord as unknown as Omit<DishEntry, 'sync_status' | 'ingredients'>),
              ingredients: (newRecord.ingredients as string[]) || [],
              sync_status: 'synced',
            };

            // Track this dish name as "ever cooked" for suggestion rotation (Req 5.5)
            setEverCookedNames((prev) => {
              const next = new Set(prev);
              next.add(entry.name.trim().toLowerCase());
              return next;
            });

            // Only add if not already present (avoids duplicating optimistic inserts)
            setDishEntries((prev) => {
              const exists = prev.some((e) => e.id === entry.id);
              if (exists) {
                // Update existing entry to synced status
                return prev.map((e) => (e.id === entry.id ? { ...entry, sync_status: 'synced' } : e));
              }
              return [entry, ...prev];
            });
            await cacheDishEntry(entry);
          } else if (eventType === 'UPDATE') {
            const updatedRecord = payload.new as Record<string, unknown>;
            const entry: DishEntry = {
              ...(updatedRecord as unknown as Omit<DishEntry, 'sync_status' | 'ingredients'>),
              ingredients: (updatedRecord.ingredients as string[]) || [],
              sync_status: 'synced',
            };

            // Last-write-wins: only apply if incoming updated_at is newer
            setDishEntries((prev) =>
              prev.map((e) => {
                if (e.id === entry.id) {
                  const localTime = new Date(e.updated_at).getTime();
                  const remoteTime = new Date(entry.updated_at).getTime();
                  // Last-write-wins: accept remote if its timestamp is >= local
                  if (remoteTime >= localTime) {
                    return entry;
                  }
                  return e;
                }
                return e;
              })
            );
            // Update cache with last-write-wins logic
            const cachedEntry = await getCachedDishEntry(entry.id);
            if (!cachedEntry || new Date(entry.updated_at).getTime() >= new Date(cachedEntry.updated_at).getTime()) {
              await cacheDishEntry(entry);
            }
          } else if (eventType === 'DELETE') {
            const oldRecord = payload.old as Record<string, unknown>;
            const deletedId = oldRecord.id as string;

            setDishEntries((prev) => prev.filter((e) => e.id !== deletedId));
            await removeCachedDishEntry(deletedId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId]);

  // Replay queued mutations when coming back online
  useEffect(() => {
    if (!isOnline) return;

    async function replayQueue() {
      const mutations = await dequeueMutations();
      for (const mutation of mutations) {
        try {
          if (mutation.type === 'INSERT') {
            const payload = mutation.payload as Record<string, unknown>;

            // If the mutation has a queued photo, upload it first
            if (mutation.photoFile) {
              const entryId = payload.id as string;
              const entryHouseholdId = payload.household_id as string;
              try {
                // Convert Blob back to File for the uploadPhoto function
                const blob = mutation.photoFile;
                const file = new File([blob], `${entryId}.jpg`, { type: blob.type || 'image/jpeg' });
                const photoPath = await uploadPhotoToStorage(file, entryHouseholdId, entryId);
                // Update payload with the uploaded photo path
                payload.photo_path = photoPath;
              } catch {
                // Photo upload failed — increment retryCount and keep in queue
                const updatedMutation = { ...mutation, retryCount: mutation.retryCount + 1 };
                await updateMutation(updatedMutation);
                continue;
              }
            }

            // Strip client-only fields before sending to Supabase
            const { sync_status: _sync, ...dbPayload } = payload as Record<string, unknown> & { sync_status?: string };
            await supabase.from('dish_entries').insert(dbPayload);

            // Update local entry to synced status (and update photo_path if it was uploaded)
            setDishEntries((prev) =>
              prev.map((e) =>
                e.id === (payload.id as string)
                  ? { ...e, sync_status: 'synced' as const, photo_path: (payload.photo_path as string | null) ?? e.photo_path }
                  : e
              )
            );
            const updatedEntry = {
              ...(payload as unknown as DishEntry),
              sync_status: 'synced' as const,
            };
            await cacheDishEntry(updatedEntry);
          } else if (mutation.type === 'DELETE') {
            const id = mutation.payload.id as string;
            await supabase.from('dish_entries').delete().eq('id', id);
          }
          await removeMutation(mutation.id);
        } catch {
          // On failure: increment retryCount, update mutation in queue, continue with next
          const updatedMutation = { ...mutation, retryCount: mutation.retryCount + 1 };
          await updateMutation(updatedMutation);
        }
      }
      const count = await getQueueLength();
      setPendingCount(count);
    }

    replayQueue();
  }, [isOnline]);

  const addDishEntry = useCallback(
    async (
      entry: Omit<DishEntry, 'id' | 'household_id' | 'created_at' | 'updated_at' | 'created_by' | 'sync_status'>,
      photoFile?: File
    ): Promise<DishEntry> => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const householdId = householdIdRef.current || '';
      const userId = userIdRef.current || '';

      const newEntry: DishEntry = {
        id,
        household_id: householdId,
        created_at: now,
        updated_at: now,
        created_by: userId,
        sync_status: isOnline ? 'synced' : 'pending',
        ...entry,
      };

      // Optimistic local update
      setDishEntries((prev) => [newEntry, ...prev]);
      await cacheDishEntry(newEntry);

      // Track this dish name as "ever cooked" for suggestion rotation (Req 5.5)
      setEverCookedNames((prev) => {
        const next = new Set(prev);
        next.add(newEntry.name.trim().toLowerCase());
        return next;
      });

      if (isOnline) {
        try {
          // Strip client-only sync_status before sending to DB
          const { sync_status: _sync, ...dbPayload } = newEntry;
          const { error } = await supabase.from('dish_entries').insert(dbPayload);
          if (error) {
            // Mark as pending and queue
            const pendingEntry = { ...newEntry, sync_status: 'pending' as const };
            setDishEntries((prev) =>
              prev.map((e) => (e.id === id ? pendingEntry : e))
            );
            await cacheDishEntry(pendingEntry);
            await queueInsertMutation(newEntry, photoFile);
          }
        } catch {
          // Network error — queue for later
          const pendingEntry = { ...newEntry, sync_status: 'pending' as const };
          setDishEntries((prev) =>
            prev.map((e) => (e.id === id ? pendingEntry : e))
          );
          await cacheDishEntry(pendingEntry);
          await queueInsertMutation(newEntry, photoFile);
        }
      } else {
        // Offline — queue mutation with photo Blob if provided (Req 9.6)
        await queueInsertMutation(newEntry, photoFile);
      }

      const count = await getQueueLength();
      setPendingCount(count);

      return newEntry;
    },
    [isOnline]
  );

  const deleteDishEntry = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic local removal
      setDishEntries((prev) => prev.filter((e) => e.id !== id));
      await removeCachedDishEntry(id);

      if (isOnline) {
        try {
          const { error } = await supabase.from('dish_entries').delete().eq('id', id);
          if (error) {
            await queueDeleteMutation(id);
          }
        } catch {
          await queueDeleteMutation(id);
        }
      } else {
        await queueDeleteMutation(id);
      }

      const count = await getQueueLength();
      setPendingCount(count);
    },
    [isOnline]
  );

  const getDishEntriesForCountry = useCallback(
    (countryCode: string): DishEntry[] => {
      return dishEntries.filter((e) => e.country_code === countryCode);
    },
    [dishEntries]
  );

  const getCountriesWithDishes = useCallback((): Set<string> => {
    return new Set(dishEntries.map((e) => e.country_code));
  }, [dishEntries]);

  const getSuggestionsForCountry = useCallback(
    (countryCode: string): PopularDish[] => {
      // Get popular dishes for this country
      const countryPopularDishes = popularDishes.filter(
        (d) => d.country_code === countryCode
      );

      // Use everCookedNames (which never shrinks on delete) to determine
      // which dishes have been cooked. This ensures deleted dishes do NOT
      // restore suggestions (Req 5.5).
      const cookedNames = Array.from(everCookedNames);

      return getUncookedSuggestions(countryPopularDishes, cookedNames);
    },
    [popularDishes, everCookedNames]
  );

  const uploadPhoto = useCallback(
    async (_file: File): Promise<string> => {
      // Placeholder — will be implemented in task 6.2
      return '';
    },
    []
  );

  return {
    isOnline,
    pendingCount,
    addDishEntry,
    deleteDishEntry,
    getDishEntriesForCountry,
    getCountriesWithDishes,
    getSuggestionsForCountry,
    uploadPhoto,
  };
}

// --- Helper functions ---

async function queueInsertMutation(entry: DishEntry, photoFile?: File): Promise<void> {
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    type: 'INSERT',
    table: 'dish_entries',
    payload: { ...entry } as unknown as Record<string, unknown>,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    photoFile: photoFile ? photoFile : undefined,
  };
  await enqueueMutation(mutation);
}

async function queueDeleteMutation(dishEntryId: string): Promise<void> {
  const mutation: QueuedMutation = {
    id: crypto.randomUUID(),
    type: 'DELETE',
    table: 'dish_entries',
    payload: { id: dishEntryId },
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
  await enqueueMutation(mutation);
}
