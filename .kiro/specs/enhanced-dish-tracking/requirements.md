# Requirements Document

## Introduction

Enhanced Dish Tracking is a major upgrade to the Cooking World Map app that transforms it from a single-device localStorage app into a cloud-synced, mobile-first experience for a couple. The enhancement adds rich dish entries (photos, ingredients, ratings, notes, recipe links), popular dish suggestions per country with rotation logic, and real-time multi-device synchronization via a cloud backend. The app remains installable as a PWA while gaining full offline-to-online sync capabilities.

## Glossary

- **App**: The Cooking World Map Progressive Web App
- **User**: One of the two people (a couple) who share the App
- **Household**: The shared account/workspace representing the couple's combined data
- **Dish_Entry**: A rich record of a cooked dish including name, photo, ingredients, notes, rating, and optional recipe link
- **Dish_Form**: The UI component for creating and editing a Dish_Entry
- **Photo_Store**: The cloud storage service responsible for uploading, storing, and serving dish photos
- **Sync_Service**: The backend service that persists data in a cloud database and synchronizes state across devices in real-time
- **Country_Panel**: The UI panel that appears when a user selects a country, showing dishes and suggestions
- **Suggestion_Engine**: The component that provides and rotates popular dish recommendations for each country
- **Popular_Dish**: A curated dish recommendation for a country, including name and recipe link
- **Suggestion_List**: The set of up to 3 Popular_Dishes currently displayed for a given country
- **Map_View**: The interactive world map component
- **Rating**: A numeric score from 1 to 10 assigned to a Dish_Entry by a User

## Requirements

### Requirement 1: Mobile-First Responsive Layout

**User Story:** As a User, I want the App to be optimized for mobile use, so that I can comfortably add and browse dishes from my phone.

#### Acceptance Criteria

1. WHILE the viewport is narrower than 768px, THE App SHALL render all UI components within a single-column layout
2. WHEN a User taps on a country on a viewport narrower than 768px, THE Country_Panel SHALL slide up from the bottom of the screen as a sheet occupying at least 90% of the viewport height
3. THE App SHALL size all interactive elements (buttons, inputs, list items) with a minimum touch target of 44x44 CSS pixels
4. WHILE the viewport is 768px or wider, THE App SHALL render the Country_Panel as a side panel between 320px and 480px wide alongside the Map_View
5. THE App SHALL use responsive font sizes with a minimum of 14px for body text and 12px for secondary text on screens as small as 320px wide
6. WHEN the Dish_Form is open on a viewport narrower than 768px, THE App SHALL scroll or reposition the view so that the active input field and the submit button remain within the visible viewport area above the virtual keyboard
7. WHEN the Country_Panel is displayed as a bottom sheet on a viewport narrower than 768px, THE App SHALL provide a visible close control that dismisses the Country_Panel and returns the User to the Map_View

### Requirement 2: Enhanced Dish Entry

**User Story:** As a User, I want to record detailed information about each dish we cook, so that we can remember the experience including photos, ingredients, and our rating.

#### Acceptance Criteria

1. WHEN a User creates a Dish_Entry, THE Dish_Form SHALL accept a dish name, a photo, an ingredients list, notes, a rating from 1 to 10, and an optional recipe link
2. THE Dish_Form SHALL require a dish name (trimmed, non-empty, maximum 100 characters) and a rating for submission, and SHALL reject names consisting only of whitespace
3. WHEN a User attaches a photo, THE Dish_Form SHALL display a preview of the selected image before submission
4. WHEN a User submits a Dish_Entry with a photo, THE App SHALL upload the photo to the Photo_Store and associate the returned URL with the Dish_Entry
5. IF a photo upload fails, THEN THE App SHALL display an error message indicating the upload failure and allow the User to retry or submit without the photo
6. WHEN a User enters a rating, THE Dish_Form SHALL constrain the value to whole numbers between 1 and 10 inclusive
7. WHEN a User provides a recipe link, THE Dish_Form SHALL validate that the link is a well-formed URL beginning with http:// or https://
8. IF a User submits a Dish_Entry with an invalid recipe link, THEN THE App SHALL display a validation message indicating the expected URL format and prevent submission
9. WHEN a Dish_Entry is successfully created, THE Country_Panel SHALL display the new entry with all provided fields visible
10. THE Dish_Form SHALL allow the ingredients field to accept multiple items as a comma-separated list or line-separated list, up to a maximum of 50 items
11. THE Dish_Form SHALL constrain the notes field to a maximum of 1000 characters

### Requirement 3: Dish Entry Display

**User Story:** As a User, I want to view the full details of dishes we have cooked, so that I can recall recipes, ratings, and memories.

#### Acceptance Criteria

1. WHEN the Country_Panel displays a Dish_Entry, THE Country_Panel SHALL show the dish name, rating displayed as a numeric value out of 10, photo thumbnail at a maximum of 80x80 CSS pixels, and creation date in the user's locale date format
2. WHEN a User taps on a Dish_Entry in the list, THE App SHALL expand the entry to show ingredients, notes, and recipe link, omitting any section whose field is empty
3. WHEN a User taps on an expanded Dish_Entry, THE App SHALL collapse the entry back to the summary view
4. WHEN a Dish_Entry has a recipe link, THE App SHALL render the link as a tappable element that opens in a new browser tab
5. WHEN a Dish_Entry has no photo, THE App SHALL display a placeholder image at the same dimensions as the photo thumbnail
6. THE Country_Panel SHALL display Dish_Entries sorted by creation date with the most recent first

### Requirement 4: Popular Dish Suggestions

**User Story:** As a User, I want to see popular dish suggestions when I select a country, so that we get inspiration for what to cook next.

#### Acceptance Criteria

1. WHEN a User opens the Country_Panel for a country, THE Suggestion_Engine SHALL display a Suggestion_List of up to 3 Popular_Dishes for that country
2. THE Suggestion_Engine SHALL include a dish name and a recipe link for each Popular_Dish in the Suggestion_List
3. WHEN a User taps a recipe link in the Suggestion_List, THE App SHALL open the link in a new browser tab
4. WHEN the Suggestion_Engine has no Popular_Dishes available for a country, THE Country_Panel SHALL hide the suggestions section entirely
5. THE Suggestion_List SHALL be displayed in a separately labeled section with a heading distinguishing it from the User's own Dish_Entries
6. IF a recipe link in the Suggestion_List fails to load or returns an error, THEN THE App SHALL still display the Popular_Dish name and indicate that the link is unavailable

### Requirement 5: Suggestion Rotation

**User Story:** As a User, I want suggestions to refresh after we cook and rate a dish, so that we always see new inspiration.

#### Acceptance Criteria

1. WHEN a User creates a Dish_Entry with a name that is an exact match to a Popular_Dish in the current Suggestion_List for that country (after case-insensitive and whitespace-trimmed comparison), THE Suggestion_Engine SHALL remove that Popular_Dish from the Suggestion_List
2. WHEN a Popular_Dish is removed from the Suggestion_List, THE Suggestion_Engine SHALL replace it with the next Popular_Dish in the curated list order for that country that has not been cooked by the Household
3. THE Suggestion_Engine SHALL compare dish names by trimming leading and trailing whitespace and applying case-insensitive matching when determining if a Popular_Dish has been cooked
4. WHILE the Household has cooked all available Popular_Dishes for a country, THE Suggestion_Engine SHALL display only the remaining uncooked Popular_Dishes (which may be fewer than 3) and SHALL hide the suggestions section entirely when no uncooked Popular_Dishes remain
5. WHEN a Dish_Entry is deleted, THE Suggestion_Engine SHALL NOT restore the corresponding Popular_Dish to the Suggestion_List

### Requirement 6: Cloud Data Synchronization

**User Story:** As a User, I want our dish data to sync across both our phones in real-time, so that either of us can add or view dishes from anywhere.

#### Acceptance Criteria

1. WHEN a User creates, updates, or deletes a Dish_Entry on one device, THE Sync_Service SHALL propagate the change to all other devices with an active authenticated session within 5 seconds
2. THE Sync_Service SHALL persist all Dish_Entries, ratings, ingredients, notes, and recipe links in a cloud database
3. WHEN a User signs in on a device for the first time, THE Sync_Service SHALL load all existing Household data from the cloud database within 10 seconds for up to 500 Dish_Entries
4. IF the device loses network connectivity, THEN THE App SHALL allow the User to continue viewing all Household data previously synced to the device's local cache
5. IF the device loses network connectivity, THEN THE App SHALL queue mutations locally and sync them within 30 seconds of connectivity being restored
6. IF a sync conflict occurs due to simultaneous edits to the same Dish_Entry, THEN THE Sync_Service SHALL resolve the conflict using a last-write-wins strategy based on the mutation timestamp
7. THE Sync_Service SHALL authenticate both Users as members of the same Household before granting data access
8. WHILE a mutation is queued locally and not yet synced, THE App SHALL display a visual indicator on the affected Dish_Entry showing its pending sync status

### Requirement 7: Photo Storage

**User Story:** As a User, I want dish photos to be stored in the cloud, so that both of us can see them on any device.

#### Acceptance Criteria

1. WHEN a User uploads a photo, THE Photo_Store SHALL store the image in a cloud storage bucket associated with the Household
2. WHEN a photo is uploaded, THE Photo_Store SHALL generate a thumbnail with a maximum width of 400px, preserving the original aspect ratio, within 10 seconds of upload completion
3. WHEN a Dish_Entry with a photo is displayed, THE App SHALL load the thumbnail from the Photo_Store via a URL
4. THE Photo_Store SHALL accept images in JPEG, PNG, and WebP formats
5. IF a User uploads an image in a format other than JPEG, PNG, or WebP, THEN THE App SHALL display a validation message indicating the accepted formats and reject the upload
6. IF a User uploads an image larger than 10MB, THEN THE App SHALL display a validation message and reject the upload
7. THE Photo_Store SHALL restrict access to photos so that only authenticated Household members can view them
8. IF a thumbnail fails to load when displaying a Dish_Entry, THEN THE App SHALL display a placeholder image in place of the thumbnail

### Requirement 8: Authentication and Household Management

**User Story:** As a User, I want to sign in to a shared household account, so that my partner and I see the same data.

#### Acceptance Criteria

1. WHEN a User opens the App without an active authenticated session, THE App SHALL present a sign-in screen before granting access to Household data or the Map_View
2. THE App SHALL support email-based authentication for sign-in and sign-up, requiring a password of at least 8 characters during sign-up
3. WHEN a User signs up, THE App SHALL create a new Household and associate the User with it
4. THE App SHALL provide a mechanism (invite link or code) for a second User to join an existing Household, where the invite expires after 48 hours or a single use, whichever comes first
5. WHILE a User is not authenticated, THE App SHALL not display any Household data or the Map_View
6. WHEN a User signs out, THE App SHALL clear locally cached Household data from the device
7. IF a User attempts to sign in with invalid credentials, THEN THE App SHALL display an error message indicating the sign-in failed and allow the User to retry
8. IF a User attempts to join a Household that already has 2 members, THEN THE App SHALL display an error message indicating the Household is full and prevent the join

### Requirement 9: Offline Support and PWA Enhancements

**User Story:** As a User, I want the App to remain usable when I have no internet connection, so that I can browse our dishes and add new ones offline.

#### Acceptance Criteria

1. THE App SHALL remain installable as a PWA with standalone display mode
2. WHILE the App is offline, THE App SHALL serve the application shell and previously cached Dish_Entries from the service worker
3. WHEN a User creates a Dish_Entry while offline, THE App SHALL store the entry locally and display it in the UI within 1 second
4. WHEN connectivity is restored, THE App SHALL automatically sync locally queued Dish_Entries to the Sync_Service in the order they were created
5. WHILE the App is offline, THE App SHALL display a persistent visual indicator informing the User of the offline state
6. IF a photo is attached to a Dish_Entry created offline, THEN THE App SHALL queue the photo upload and complete it when connectivity is restored
7. IF syncing a queued Dish_Entry fails after connectivity is restored, THEN THE App SHALL retain the entry in the local queue, display an error indication to the User, and retry the sync automatically on the next connectivity change
8. WHEN all queued Dish_Entries have been successfully synced after connectivity is restored, THE App SHALL remove the offline visual indicator and confirm sync completion to the User

### Requirement 10: Data Migration from localStorage

**User Story:** As a User, I want my existing dish data to be migrated to the cloud, so that I do not lose our cooking history when upgrading.

#### Acceptance Criteria

1. WHEN an authenticated User opens the App and localStorage contains existing dish data under the "cooking-world-map-dishes" key, THE App SHALL display a migration prompt offering to migrate the data to the cloud database
2. WHEN the User confirms migration, THE App SHALL upload all existing Dish_Entries to the Sync_Service associated with the Household and display a progress indicator showing the migration status
3. WHEN migration completes successfully, THE App SHALL remove the dish data from localStorage so that the migration prompt is not displayed on subsequent App opens
4. IF migration fails, THEN THE App SHALL retain the localStorage data, display an error message indicating the failure, and provide a retry option that skips any entries already successfully migrated
5. THE App SHALL migrate existing dishes by mapping the current Dish fields (name, countryCode, createdAt) to the new Dish_Entry format with empty values for photo, ingredients, notes, and recipe link, and a null rating that the User can fill in later from the Dish_Entry detail view
6. IF the User dismisses the migration prompt without confirming, THEN THE App SHALL not migrate the data and SHALL display the migration prompt again on the next App open
