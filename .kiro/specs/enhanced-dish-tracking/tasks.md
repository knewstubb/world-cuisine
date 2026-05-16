# Implementation Plan: Enhanced Dish Tracking

## Overview

This plan transforms the Cooking World Map from a single-device localStorage app into a cloud-synced, mobile-first experience for a couple. Implementation proceeds from backend infrastructure (Supabase schema, RLS, storage) through authentication, data layer with offline support, enhanced UI components, and finally comprehensive testing. Each task builds incrementally on prior work, ensuring no orphaned code.

## Tasks

- [x] 1. Supabase project setup and database schema
  - [x] 1.1 Create Supabase client configuration and install dependencies
    - Install `@supabase/supabase-js` and `idb-keyval` packages
    - Create `src/lib/supabase.ts` with client initialization using environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
    - Create `.env.example` with placeholder values
    - Add `src/vite-env.d.ts` augmentation for `ImportMetaEnv`
    - _Requirements: 6.2, 6.7_

  - [x] 1.2 Create database migration for households and members tables
    - Create `supabase/migrations/001_households.sql` with `households` and `household_members` tables per design schema
    - Include indexes (`idx_household_members_user`)
    - Enable RLS on both tables with policies for member-scoped reads
    - Add constraint for max 2 members per household via trigger or application logic
    - _Requirements: 8.3, 8.4, 8.8_

  - [x] 1.3 Create database migration for dish_entries table
    - Create `supabase/migrations/002_dish_entries.sql` with `dish_entries` table per design schema
    - Include all CHECK constraints (name length, rating range, ingredients array length, notes length, recipe_link format)
    - Create indexes (`idx_dish_entries_household_country`, `idx_dish_entries_household`)
    - Enable RLS with household-scoped CRUD policy
    - _Requirements: 2.2, 2.6, 2.7, 2.10, 2.11, 6.2_

  - [x] 1.4 Create database migration for popular_dishes table and seed data
    - Create `supabase/migrations/003_popular_dishes.sql` with `popular_dishes` table
    - Create index (`idx_popular_dishes_country`)
    - Enable RLS with public read policy
    - Create `supabase/seed.sql` with curated popular dishes for at least 20 countries (3+ dishes each with recipe links and sort_order)
    - _Requirements: 4.1, 4.2_

  - [x] 1.5 Configure Supabase Storage bucket for dish photos
    - Create `supabase/migrations/004_storage.sql` to create `dish-photos` private bucket
    - Add storage RLS policies: household members can upload to `{household_id}/*` path and read from their household folder
    - Set max file size to 10MB via storage policy
    - _Requirements: 7.1, 7.7_

- [x] 2. Authentication and household management
  - [x] 2.1 Create AuthGate component with sign-in/sign-up forms
    - Create `src/components/AuthGate/AuthGate.tsx` and `AuthGate.module.css`
    - Implement email/password sign-in form with validation (password min 8 chars)
    - Implement sign-up form that creates a new household on registration
    - Show error messages for invalid credentials (Req 8.7)
    - Gate all app content behind authentication (Req 8.1, 8.5)
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.7_

  - [x] 2.2 Implement invite flow for joining a household
    - Add invite code generation to household creation (UUID-based code)
    - Create invite join UI within AuthGate (input for invite code)
    - Validate invite expiry (48 hours) and single-use constraint
    - Reject join if household already has 2 members (Req 8.8)
    - Store invite_code and invite_expires_at on households table
    - _Requirements: 8.4, 8.8_

  - [x] 2.3 Implement sign-out and session management
    - Add sign-out button to app header/menu
    - Clear IndexedDB cached data on sign-out (Req 8.6)
    - Handle session expiry with re-authentication flow
    - _Requirements: 8.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Enhanced data types and SyncService
  - [x] 4.1 Create enhanced type definitions
    - Create `src/types/DishEntry.ts` with `DishEntry`, `SyncStatus`, `PopularDish`, `Household`, `HouseholdMember` interfaces per design
    - Create `src/types/QueuedMutation.ts` with `QueuedMutation` interface for offline queue
    - _Requirements: 2.1, 6.5_

  - [x] 4.2 Implement IndexedDB offline queue and cache layer
    - Create `src/lib/offlineQueue.ts` using idb-keyval or raw IndexedDB API
    - Implement stores: `dish_entries_cache`, `mutation_queue`, `popular_dishes_cache`
    - Implement `enqueueMutation`, `dequeueMutations`, `removeMutation`, `getQueueLength` functions
    - Ensure FIFO ordering for mutation dequeue
    - Support storing photo Blobs for offline uploads
    - _Requirements: 6.4, 6.5, 9.3, 9.4_

  - [x] 4.3 Implement SyncService hook with optimistic updates
    - Create `src/hooks/useSyncService.ts` implementing the `SyncServiceValue` interface from design
    - Implement `addDishEntry` with optimistic local update + Supabase INSERT
    - Implement `deleteDishEntry` with optimistic local update + Supabase DELETE
    - Implement `getDishEntriesForCountry` reading from local cache
    - Implement `getCountriesWithDishes` from local cache
    - Queue mutations to IndexedDB when offline
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [x] 4.4 Implement real-time sync via Supabase Realtime subscriptions
    - Subscribe to `dish_entries` table changes filtered by `household_id`
    - Handle INSERT, UPDATE, DELETE events from other devices
    - Update local IndexedDB cache and React state on incoming changes
    - Implement last-write-wins conflict resolution using `updated_at` timestamps
    - _Requirements: 6.1, 6.6_

  - [x] 4.5 Implement online/offline detection and queue replay
    - Listen to `navigator.onLine` and `online`/`offline` events
    - On reconnect: dequeue mutations in FIFO order and sync to Supabase
    - Handle sync failures: retain in queue, increment retryCount, retry on next connectivity change
    - Track `pendingCount` for UI indicators
    - _Requirements: 6.5, 9.4, 9.7_

  - [x] 4.6 Implement SyncStatusProvider context
    - Create `src/providers/SyncStatusProvider.tsx` wrapping the SyncService hook
    - Provide sync state (isOnline, pendingCount, all CRUD methods) to component tree
    - Replace `DishStoreProvider` usage in `App.tsx` with `SyncStatusProvider`
    - _Requirements: 6.1, 6.4, 6.8_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Photo upload and storage
  - [x] 6.1 Implement photo validation utilities
    - Create `src/lib/photoValidation.ts` with `validatePhotoFile(file: File)` function
    - Accept only `image/jpeg`, `image/png`, `image/webp` MIME types
    - Reject files larger than 10MB
    - Return validation result with error message
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 6.2 Implement photo upload service
    - Create `src/lib/photoUpload.ts` with `uploadPhoto(file: File, householdId: string, dishEntryId: string)` function
    - Upload to Supabase Storage at path `{household_id}/{dish_entry_id}.{ext}`
    - Return the storage path on success
    - Handle upload errors with descriptive messages
    - _Requirements: 7.1, 2.4_

  - [x] 6.3 Implement thumbnail URL builder
    - Create `src/lib/thumbnailUrl.ts` with `getThumbnailUrl(photoPath: string)` function
    - Construct URL using Supabase Storage base URL + photo path + `?width=400` transform parameter
    - _Requirements: 7.2, 7.3_

  - [x] 6.4 Create PhotoUploader component
    - Create `src/components/PhotoUploader/PhotoUploader.tsx` and `PhotoUploader.module.css`
    - Implement file input accepting JPEG, PNG, WebP
    - Show image preview using local object URL
    - Display validation errors for invalid format/size
    - Provide remove/change actions
    - Touch-friendly (44x44px targets)
    - _Requirements: 2.3, 7.4, 7.5, 7.6, 1.3_

- [x] 7. Enhanced DishForm with all new fields
  - [x] 7.1 Create RatingInput component
    - Create `src/components/RatingInput/RatingInput.tsx` and `RatingInput.module.css`
    - Render 1-10 numeric selector (number input with min=1, max=10, step=1)
    - Constrain to whole numbers only
    - Touch-friendly sizing (44x44px targets)
    - _Requirements: 2.6, 1.3_

  - [x] 7.2 Implement form validation utilities
    - Create `src/lib/dishValidation.ts` with pure validation functions:
      - `validateDishName(name: string): ValidationResult` — trimmed non-empty, max 100 chars
      - `validateRating(value: number | null): ValidationResult` — integer 1-10
      - `validateRecipeLink(link: string): ValidationResult` — starts with http:// or https://
      - `parseIngredients(input: string): string[]` — split by comma/newline, trim, discard empty, max 50
      - `validateNotes(notes: string): ValidationResult` — max 1000 chars
    - _Requirements: 2.2, 2.6, 2.7, 2.10, 2.11_

  - [x] 7.3 Enhance DishForm with all new fields
    - Rewrite `src/components/DishForm/DishForm.tsx` to include: name (required), rating (required), photo (optional via PhotoUploader), ingredients (textarea, comma/line separated), notes (textarea, max 1000), recipe_link (URL input)
    - Integrate validation functions from `dishValidation.ts`
    - Show inline validation messages per field
    - Handle photo upload on submission (with error handling and retry/skip options)
    - Wire to SyncService `addDishEntry` instead of old `addDish`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10, 2.11_

- [x] 8. Enhanced DishEntryCard with expand/collapse
  - [x] 8.1 Create DishEntryCard component
    - Create `src/components/DishEntryCard/DishEntryCard.tsx` and `DishEntryCard.module.css`
    - Summary view: dish name, rating (X/10), photo thumbnail (80x80px) or placeholder, creation date in locale format
    - Expanded view: ingredients list, notes, recipe link (opens in new tab)
    - Omit empty optional sections when expanded
    - Show sync status indicator (pending/error badge)
    - Tap to toggle expand/collapse
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.8_

  - [x] 8.2 Update DishList to use DishEntryCard and sort by date descending
    - Rewrite `src/components/DishList/DishList.tsx` to render `DishEntryCard` components
    - Sort entries by `created_at` descending (most recent first)
    - Manage expanded state (only one expanded at a time or independent)
    - Wire delete action through SyncService
    - _Requirements: 3.6, 3.1_

- [x] 9. SuggestionList and rotation logic
  - [x] 9.1 Implement suggestion query logic
    - Create `src/lib/suggestions.ts` with:
      - `getUncockedSuggestions(popularDishes: PopularDish[], cookedNames: string[]): PopularDish[]` — filter out cooked dishes (case-insensitive trimmed match), return first 3 by sort_order
      - `dishNameMatches(a: string, b: string): boolean` — trim + lowercase comparison
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 9.2 Create SuggestionList component
    - Create `src/components/SuggestionList/SuggestionList.tsx` and `SuggestionList.module.css`
    - Fetch popular dishes for country from SyncService cache
    - Display up to 3 uncooked suggestions with name + recipe link (opens in new tab)
    - Hide section entirely when no suggestions available
    - Show "link unavailable" indicator for broken links
    - Render in a separately labeled section with heading
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.4_

  - [x] 9.3 Integrate suggestion rotation with dish creation
    - When a dish is added, re-evaluate suggestions for that country
    - Ensure deleted dishes do NOT restore suggestions (track via existing dish_entries in DB, not local state)
    - _Requirements: 5.1, 5.2, 5.5_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Offline support enhancements
  - [x] 11.1 Create OfflineIndicator component
    - Create `src/components/OfflineIndicator/OfflineIndicator.tsx` and `OfflineIndicator.module.css`
    - Show persistent banner when `navigator.onLine` is false
    - Show "Syncing..." state while queue is being processed after reconnect
    - Remove indicator when all queued items synced successfully
    - _Requirements: 9.5, 9.8_

  - [x] 11.2 Implement offline photo queuing
    - Store photo Blob in IndexedDB `mutation_queue` entry when offline
    - On reconnect: upload queued photos before inserting dish_entry
    - Handle upload failure with retry logic
    - _Requirements: 9.6, 9.7_

  - [x] 11.3 Update PWA service worker configuration for Supabase caching
    - Extend `vite.config.ts` workbox config with runtime caching strategies for Supabase API responses
    - Cache popular_dishes responses for offline access
    - Cache authenticated user session data
    - _Requirements: 9.1, 9.2_

- [x] 12. Mobile-first responsive redesign
  - [x] 12.1 Implement bottom sheet CountryPanel for mobile
    - Update `src/components/CountryPanel/CountryPanel.tsx` and `CountryPanel.module.css`
    - At viewport <768px: render as bottom sheet (slide up, 90%+ viewport height)
    - At viewport >=768px: render as side panel (320-480px wide)
    - Add visible close control for bottom sheet
    - Use CSS media queries or `matchMedia` hook
    - _Requirements: 1.2, 1.4, 1.7_

  - [x] 12.2 Apply mobile-first responsive styles across all components
    - Update `src/App.module.css` for single-column layout at <768px
    - Ensure all interactive elements have minimum 44x44px touch targets
    - Set responsive font sizes (min 14px body, 12px secondary) down to 320px viewport
    - Ensure DishForm scrolls/repositions to keep active input visible above virtual keyboard
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

- [x] 13. Data migration from localStorage
  - [x] 13.1 Create MigrationPrompt component and migration logic
    - Create `src/components/MigrationPrompt/MigrationPrompt.tsx` and `MigrationPrompt.module.css`
    - Create `src/lib/migration.ts` with:
      - `detectLegacyData(): boolean` — check localStorage for "cooking-world-map-dishes" key
      - `migrateLegacyDishes(householdId: string, userId: string): Promise<MigrationResult>` — map old Dish fields to new DishEntry format (photo_path=null, ingredients=[], notes=null, recipe_link=null, rating=null)
    - Show migration prompt when authenticated user has legacy data
    - Display progress indicator during migration
    - On success: clear localStorage data
    - On failure: retain localStorage, show error with retry (skip already-migrated)
    - On dismiss: don't migrate, show prompt again next open
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 14. Wire all components together in App
  - [x] 14.1 Update App.tsx with full component integration
    - Wrap app in `SyncStatusProvider` (replacing `DishStoreProvider`)
    - Add `AuthGate` as outermost content gate
    - Add `OfflineIndicator` to app shell
    - Add `MigrationPrompt` after authentication
    - Update `CountryPanel` to include `SuggestionList`
    - Update `MapView` to use SyncService's `getCountriesWithDishes`
    - Ensure all data flows through SyncService
    - _Requirements: 8.1, 8.5, 9.5, 10.1_

- [x] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Property-based tests
  - [x] 16.1 Write property test for dish name validation
    - **Property 1: Dish name validation**
    - **Validates: Requirements 2.2**

  - [x] 16.2 Write property test for rating constraint
    - **Property 2: Rating constraint**
    - **Validates: Requirements 2.6**

  - [x] 16.3 Write property test for recipe link validation
    - **Property 3: Recipe link validation**
    - **Validates: Requirements 2.7**

  - [x] 16.4 Write property test for ingredients parsing
    - **Property 4: Ingredients parsing**
    - **Validates: Requirements 2.10**

  - [x] 16.5 Write property test for dish entry display completeness
    - **Property 5: Dish entry display completeness**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 16.6 Write property test for dish entries sorted by creation date descending
    - **Property 6: Dish entries sorted by creation date descending**
    - **Validates: Requirements 3.6**

  - [x] 16.7 Write property test for suggestion filtering
    - **Property 7: Suggestion filtering returns valid bounded subset**
    - **Validates: Requirements 4.1, 4.2, 5.4**

  - [x] 16.8 Write property test for suggestion match logic
    - **Property 8: Suggestion rotation via case-insensitive trimmed match**
    - **Validates: Requirements 5.1, 5.3**

  - [x] 16.9 Write property test for suggestion replacement order
    - **Property 9: Suggestion replacement by sort order**
    - **Validates: Requirements 5.2**

  - [x] 16.10 Write property test for deleted dish suggestion persistence
    - **Property 10: Deleted dish does not restore suggestion**
    - **Validates: Requirements 5.5**

  - [x] 16.11 Write property test for offline queue FIFO ordering
    - **Property 11: Offline queue FIFO ordering**
    - **Validates: Requirements 6.5, 9.4**

  - [x] 16.12 Write property test for last-write-wins conflict resolution
    - **Property 12: Last-write-wins conflict resolution**
    - **Validates: Requirements 6.6**

  - [x] 16.13 Write property test for thumbnail URL construction
    - **Property 13: Thumbnail URL construction**
    - **Validates: Requirements 7.3**

  - [x] 16.14 Write property test for photo format validation
    - **Property 14: Photo format validation**
    - **Validates: Requirements 7.4, 7.5, 7.6**

  - [x] 16.15 Write property test for invite expiry validation
    - **Property 15: Invite expiry validation**
    - **Validates: Requirements 8.4**

  - [x] 16.16 Write property test for household membership cap
    - **Property 16: Household membership cap**
    - **Validates: Requirements 8.8**

  - [x] 16.17 Write property test for failed sync retry preserves queue
    - **Property 17: Failed sync retry preserves queue**
    - **Validates: Requirements 9.7**

  - [x] 16.18 Write property test for migration field mapping
    - **Property 18: Migration field mapping**
    - **Validates: Requirements 10.5**

  - [x] 16.19 Write property test for partial migration retry
    - **Property 19: Partial migration retry skips already-migrated entries**
    - **Validates: Requirements 10.4**

- [x] 17. Integration tests
  - [x] 17.1 Write integration tests for authentication and household flows
    - Test sign-up creates household
    - Test invite join flow with expiry and single-use
    - Test rejection when household is full
    - Test sign-in with invalid credentials shows error
    - _Requirements: 8.2, 8.3, 8.4, 8.7, 8.8_

  - [x] 17.2 Write integration tests for dish entry CRUD and real-time sync
    - Test create dish entry persists all fields to DB
    - Test real-time sync between two authenticated clients
    - Test RLS enforcement (non-household user cannot access data)
    - _Requirements: 6.1, 6.2, 6.7_

  - [x] 17.3 Write integration tests for photo upload and storage
    - Test photo upload to correct bucket path
    - Test thumbnail URL returns transformed image
    - Test storage RLS (non-household user cannot access photos)
    - _Requirements: 7.1, 7.2, 7.7_

  - [x] 17.4 Write integration tests for offline sync and migration
    - Test offline mutation queue replays in order on reconnect
    - Test migration maps legacy data correctly
    - Test partial migration retry skips already-migrated entries
    - _Requirements: 9.4, 10.2, 10.4_

- [x] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- Supabase migrations should be run via `supabase db push` or `supabase migration up` during development
- The existing `DishStore` and `Dish` type will be superseded by `SyncService` and `DishEntry` — old code can be removed after task 14.1 wires everything together
- Install `fake-indexeddb` as a dev dependency for testing offline queue logic

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "4.2", "6.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "4.3", "6.2", "6.3", "7.2"] },
    { "id": 4, "tasks": ["4.4", "4.5", "6.4", "7.1"] },
    { "id": 5, "tasks": ["4.6", "7.3"] },
    { "id": 6, "tasks": ["8.1", "9.1"] },
    { "id": 7, "tasks": ["8.2", "9.2", "9.3"] },
    { "id": 8, "tasks": ["11.1", "11.2", "11.3", "12.1"] },
    { "id": 9, "tasks": ["12.2", "13.1"] },
    { "id": 10, "tasks": ["14.1"] },
    { "id": 11, "tasks": ["16.1", "16.2", "16.3", "16.4", "16.5", "16.6", "16.7", "16.8", "16.9", "16.10", "16.11", "16.12", "16.13", "16.14", "16.15", "16.16", "16.17", "16.18", "16.19"] },
    { "id": 12, "tasks": ["17.1", "17.2", "17.3", "17.4"] }
  ]
}
```
