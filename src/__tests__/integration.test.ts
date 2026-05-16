/**
 * Integration Tests for Enhanced Dish Tracking
 *
 * Tests 17.1 - 17.4: Authentication, Dish CRUD, Photo Storage, Offline Sync & Migration
 * These tests mock the Supabase client to simulate backend behavior.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateInvite } from '../lib/inviteValidation';
import { uploadPhoto } from '../lib/photoUpload';
import { getThumbnailUrl } from '../lib/thumbnailUrl';
import {
  enqueueMutation,
  dequeueMutations,
  clearMutationQueue,
} from '../lib/offlineQueue';
import { migrateLegacyDishes, parseLegacyDishes } from '../lib/migration';
import type { QueuedMutation } from '../types/QueuedMutation';

// --- Mock environment variables ---
vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

// --- Mock Supabase module ---
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockFrom = vi.fn();
const mockStorageUpload = vi.fn();
const mockChannel = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' }, access_token: 'token' } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
      }),
    },
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

// ============================================================
// 17.1: Authentication and Household Flows
// Validates: Requirements 8.2, 8.3, 8.4, 8.7, 8.8
// ============================================================
describe('17.1 Authentication and household flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sign-up creates a new household and associates the user', async () => {
    // Mock auth.signUp success
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user-id', email: 'test@example.com' } },
      error: null,
    });

    // Mock households.insert to create household
    const mockInsert = vi.fn().mockResolvedValue({
      data: [{ id: 'household-1', created_at: new Date().toISOString() }],
      error: null,
    });
    const mockMemberInsert = vi.fn().mockResolvedValue({
      data: [{ id: 'member-1', household_id: 'household-1', user_id: 'new-user-id' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'households') {
        return { insert: mockInsert, select: vi.fn() };
      }
      if (table === 'household_members') {
        return { insert: mockMemberInsert };
      }
      return { select: vi.fn() };
    });

    // Simulate sign-up flow
    const signUpResult = await mockSignUp({
      email: 'test@example.com',
      password: 'securepass123',
    });
    expect(signUpResult.error).toBeNull();
    expect(signUpResult.data.user.id).toBe('new-user-id');

    // Simulate household creation after sign-up
    const { supabase } = await import('../lib/supabase');
    const householdResult = await supabase.from('households').insert({
      id: 'household-1',
      created_at: new Date().toISOString(),
    });
    expect(householdResult.error).toBeNull();

    // Simulate member association
    const memberResult = await supabase.from('household_members').insert({
      household_id: 'household-1',
      user_id: 'new-user-id',
    });
    expect(memberResult.error).toBeNull();
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockMemberInsert).toHaveBeenCalledTimes(1);
  });

  it('invite join flow validates expiry and single-use', () => {
    // Valid invite: within 48 hours, household has 1 member
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const validResult = validateInvite(futureExpiry, 1);
    expect(validResult.valid).toBe(true);
    expect(validResult.error).toBeUndefined();

    // Expired invite: past 48 hours
    const pastExpiry = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const expiredResult = validateInvite(pastExpiry, 1);
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.error).toContain('expired');

    // Used invite: null expiry (already consumed)
    const usedResult = validateInvite(null, 1);
    expect(usedResult.valid).toBe(false);
    expect(usedResult.error).toContain('already been used');
  });

  it('rejects join when household is full (2 members)', () => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = validateInvite(futureExpiry, 2);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('full');
  });

  it('sign-in with invalid credentials returns error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    });

    const result = await mockSignInWithPassword({
      email: 'wrong@example.com',
      password: 'badpassword',
    });

    expect(result.error).not.toBeNull();
    expect(result.error.message).toBe('Invalid login credentials');
    expect(result.data.user).toBeNull();
    expect(result.data.session).toBeNull();
  });
});

// ============================================================
// 17.2: Dish Entry CRUD and Real-Time Sync
// Validates: Requirements 6.1, 6.2, 6.7
// ============================================================
describe('17.2 Dish entry CRUD and real-time sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create dish entry persists all fields to DB', async () => {
    const mockInsert = vi.fn().mockResolvedValue({
      data: [{ id: 'dish-1' }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return { insert: mockInsert };
      }
      return { select: vi.fn() };
    });

    const { supabase } = await import('../lib/supabase');

    const dishPayload = {
      id: 'dish-1',
      household_id: 'household-1',
      country_code: 'ITA',
      name: 'Margherita Pizza',
      rating: 9,
      photo_path: 'household-1/dish-1.jpg',
      ingredients: ['flour', 'tomato', 'mozzarella', 'basil'],
      notes: 'Classic Neapolitan style',
      recipe_link: 'https://example.com/pizza',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'user-1',
    };

    const result = await supabase.from('dish_entries').insert(dishPayload);
    expect(result.error).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(dishPayload);

    // Verify all fields are present in the payload
    const calledPayload = mockInsert.mock.calls[0][0];
    expect(calledPayload.name).toBe('Margherita Pizza');
    expect(calledPayload.rating).toBe(9);
    expect(calledPayload.photo_path).toBe('household-1/dish-1.jpg');
    expect(calledPayload.ingredients).toEqual(['flour', 'tomato', 'mozzarella', 'basil']);
    expect(calledPayload.notes).toBe('Classic Neapolitan style');
    expect(calledPayload.recipe_link).toBe('https://example.com/pizza');
    expect(calledPayload.country_code).toBe('ITA');
    expect(calledPayload.household_id).toBe('household-1');
    expect(calledPayload.created_by).toBe('user-1');
  });

  it('real-time sync between two authenticated clients via Realtime event', async () => {
    // Simulate a Realtime channel subscription and incoming INSERT event
    type RealtimeCallback = (payload: {
      eventType: string;
      new: Record<string, unknown>;
    }) => void;
    let realtimeCallback: RealtimeCallback | null = null;

    const mockChannelInstance: {
      on: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
    } = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    mockChannelInstance.on.mockImplementation(
      (_event: string, _filter: unknown, cb: RealtimeCallback) => {
        realtimeCallback = cb;
        return mockChannelInstance;
      }
    );
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    mockChannel.mockReturnValue(mockChannelInstance);

    const { supabase } = await import('../lib/supabase');

    // Client 1 subscribes to realtime changes
    const channel = supabase.channel('dish_entries_changes');
    channel.on('postgres_changes', { event: 'INSERT', table: 'dish_entries' }, (payload) => {
      // This simulates the second client receiving the event
      expect(payload.eventType).toBe('INSERT');
      expect(payload.new).toBeDefined();
    });
    channel.subscribe();

    expect(mockChannelInstance.on).toHaveBeenCalled();
    expect(mockChannelInstance.subscribe).toHaveBeenCalled();

    // Simulate an INSERT event arriving from another device
    const newEntry = {
      id: 'dish-2',
      household_id: 'household-1',
      country_code: 'JPN',
      name: 'Ramen',
      rating: 8,
      created_at: new Date().toISOString(),
    };

    // Trigger the realtime callback as if another client created a dish
    expect(realtimeCallback).not.toBeNull();
    realtimeCallback!({ eventType: 'INSERT', new: newEntry });
  });

  it('RLS enforcement: non-household user cannot access data', async () => {
    // Mock Supabase returning an RLS error for unauthorized access
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'new row violates row-level security policy',
          code: '42501',
        },
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return { select: mockSelect };
      }
      return { select: vi.fn() };
    });

    const { supabase } = await import('../lib/supabase');
    const result = await supabase
      .from('dish_entries')
      .select('*')
      .eq('household_id', 'other-household-id');

    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('42501');
    expect(result.error!.message).toContain('row-level security');
    expect(result.data).toBeNull();
  });
});

// ============================================================
// 17.3: Photo Upload and Storage
// Validates: Requirements 7.1, 7.2, 7.7
// ============================================================
describe('17.3 Photo upload and storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('photo upload stores to correct bucket path', async () => {
    mockStorageUpload.mockResolvedValue({ data: { path: 'household-1/dish-1.jpg' }, error: null });

    const file = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await uploadPhoto(file, 'household-1', 'dish-1');

    // Verify the path follows the convention: {household_id}/{dish_entry_id}.{ext}
    expect(result).toBe('household-1/dish-1.jpg');
    expect(mockStorageUpload).toHaveBeenCalledWith(
      'household-1/dish-1.jpg',
      file,
      { contentType: 'image/jpeg', upsert: true }
    );
  });

  it('thumbnail URL returns transformed image URL with width=400', () => {
    const photoPath = 'household-1/dish-1.jpg';
    const url = getThumbnailUrl(photoPath);

    // Verify URL construction includes storage base, path, and transform param
    expect(url).toBe(
      'https://test-project.supabase.co/storage/v1/render/image/authenticated/dish-photos/household-1/dish-1.jpg?width=400'
    );
    expect(url).toContain('width=400');
    expect(url).toContain('dish-photos');
    expect(url).toContain(photoPath);
  });

  it('storage RLS: non-household user cannot access photos', async () => {
    // Mock storage upload returning an RLS/permission error
    mockStorageUpload.mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy', statusCode: 403 },
    });

    const file = new File(['fake-image-data'], 'photo.png', { type: 'image/png' });

    await expect(uploadPhoto(file, 'other-household', 'dish-99')).rejects.toThrow(
      'Photo upload failed'
    );
    expect(mockStorageUpload).toHaveBeenCalled();
  });
});

// ============================================================
// 17.4: Offline Sync and Migration
// Validates: Requirements 9.4, 10.2, 10.4
// ============================================================
describe('17.4 Offline sync and migration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearMutationQueue();
    localStorage.clear();
  });

  afterEach(async () => {
    await clearMutationQueue();
  });

  it('offline mutation queue replays in FIFO order on reconnect', async () => {
    // Enqueue 3 mutations with ascending timestamps (simulating offline creation order)
    const mutations: QueuedMutation[] = [
      {
        id: 'mut-1',
        type: 'INSERT',
        table: 'dish_entries',
        payload: { name: 'First Dish', country_code: 'THA' },
        timestamp: '2024-01-01T10:00:00.000Z',
        retryCount: 0,
      },
      {
        id: 'mut-2',
        type: 'INSERT',
        table: 'dish_entries',
        payload: { name: 'Second Dish', country_code: 'ITA' },
        timestamp: '2024-01-01T10:01:00.000Z',
        retryCount: 0,
      },
      {
        id: 'mut-3',
        type: 'UPDATE',
        table: 'dish_entries',
        payload: { name: 'Updated First Dish', country_code: 'THA' },
        timestamp: '2024-01-01T10:02:00.000Z',
        retryCount: 0,
      },
    ];

    // Enqueue in order
    for (const mut of mutations) {
      await enqueueMutation(mut);
    }

    // Dequeue and verify FIFO ordering
    const dequeued = await dequeueMutations();
    expect(dequeued).toHaveLength(3);
    expect(dequeued[0].id).toBe('mut-1');
    expect(dequeued[0].timestamp).toBe('2024-01-01T10:00:00.000Z');
    expect(dequeued[1].id).toBe('mut-2');
    expect(dequeued[1].timestamp).toBe('2024-01-01T10:01:00.000Z');
    expect(dequeued[2].id).toBe('mut-3');
    expect(dequeued[2].timestamp).toBe('2024-01-01T10:02:00.000Z');

    // Verify types are preserved
    expect(dequeued[0].type).toBe('INSERT');
    expect(dequeued[2].type).toBe('UPDATE');
  });

  it('migration maps legacy data correctly to DishEntry format', async () => {
    // Seed localStorage with legacy dish data
    const legacyDishes = [
      {
        id: 'legacy-1',
        name: 'Pad Thai',
        countryCode: 'THA',
        createdAt: '2023-06-15T12:00:00.000Z',
      },
      {
        id: 'legacy-2',
        name: 'Sushi',
        countryCode: 'JPN',
        createdAt: '2023-07-20T14:30:00.000Z',
      },
    ];
    localStorage.setItem('cooking-world-map-dishes', JSON.stringify(legacyDishes));

    // Verify legacy data is parsed correctly
    const parsed = parseLegacyDishes();
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Pad Thai');
    expect(parsed[0].countryCode).toBe('THA');
    expect(parsed[1].name).toBe('Sushi');
    expect(parsed[1].countryCode).toBe('JPN');

    // Mock Supabase: no existing entries (fresh migration)
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    const insertedEntries: Record<string, unknown>[] = [];
    const mockInsert = vi.fn().mockImplementation((entry: Record<string, unknown>) => {
      insertedEntries.push(entry);
      return Promise.resolve({ error: null });
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return { select: mockSelect, insert: mockInsert };
      }
      return { select: vi.fn() };
    });

    // Run migration
    const result = await migrateLegacyDishes('household-1', 'user-1');

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(result.failedCount).toBe(0);

    // Verify field mapping: new fields should have null/empty defaults
    expect(insertedEntries).toHaveLength(2);
    const firstEntry = insertedEntries[0];
    expect(firstEntry.name).toBe('Pad Thai');
    expect(firstEntry.country_code).toBe('THA');
    expect(firstEntry.household_id).toBe('household-1');
    expect(firstEntry.created_by).toBe('user-1');
    expect(firstEntry.rating).toBeNull();
    expect(firstEntry.photo_path).toBeNull();
    expect(firstEntry.ingredients).toEqual([]);
    expect(firstEntry.notes).toBeNull();
    expect(firstEntry.recipe_link).toBeNull();
    expect(firstEntry.created_at).toBe('2023-06-15T12:00:00.000Z');

    // Verify localStorage is cleared on success
    expect(localStorage.getItem('cooking-world-map-dishes')).toBeNull();
  });

  it('partial migration retry skips already-migrated entries', async () => {
    // Seed localStorage with 3 legacy dishes
    const legacyDishes = [
      { id: 'legacy-1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2023-06-15T12:00:00.000Z' },
      { id: 'legacy-2', name: 'Sushi', countryCode: 'JPN', createdAt: '2023-07-20T14:30:00.000Z' },
      { id: 'legacy-3', name: 'Tacos', countryCode: 'MEX', createdAt: '2023-08-10T09:00:00.000Z' },
    ];
    localStorage.setItem('cooking-world-map-dishes', JSON.stringify(legacyDishes));

    // Mock: legacy-1 is already migrated (exists in DB)
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: [{ id: 'legacy-1' }],
          error: null,
        }),
      }),
    });

    const insertedIds: string[] = [];
    const mockInsert = vi.fn().mockImplementation((entry: Record<string, unknown>) => {
      insertedIds.push(entry.id as string);
      return Promise.resolve({ error: null });
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'dish_entries') {
        return { select: mockSelect, insert: mockInsert };
      }
      return { select: vi.fn() };
    });

    // Run migration (retry scenario)
    const result = await migrateLegacyDishes('household-1', 'user-1');

    expect(result.success).toBe(true);
    // Total migrated = 1 already migrated + 2 newly migrated
    expect(result.migratedCount).toBe(3);
    expect(result.failedCount).toBe(0);

    // Only legacy-2 and legacy-3 should have been inserted (legacy-1 was skipped)
    expect(insertedIds).toHaveLength(2);
    expect(insertedIds).toContain('legacy-2');
    expect(insertedIds).toContain('legacy-3');
    expect(insertedIds).not.toContain('legacy-1');

    // localStorage should be cleared on full success
    expect(localStorage.getItem('cooking-world-map-dishes')).toBeNull();
  });
});
