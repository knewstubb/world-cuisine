# Tasks

## Task 1: Project Setup and Configuration

- [x] 1.1 Initialize Vite + React + TypeScript project with `npm create vite@latest`
- [x] 1.2 Install dependencies: `react-leaflet`, `leaflet`, `@types/leaflet`, `fast-check`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- [x] 1.3 Install PWA plugin: `vite-plugin-pwa`
- [x] 1.4 Configure Vitest in `vite.config.ts` with jsdom environment
- [x] 1.5 Add Natural Earth 110m GeoJSON countries file to `public/` directory
- [x] 1.6 Set up base CSS with CSS Modules support and global reset styles

## Task 2: Data Layer — DishStore Context and localStorage Persistence

- [x] 2.1 Create `Dish` TypeScript interface with id, name, countryCode, createdAt fields
- [x] 2.2 Implement `DishStoreProvider` React context with state management for dishes array
- [x] 2.3 Implement `useDishStore` custom hook exposing getDishesForCountry, addDish, deleteDish, getAllDishNames, getCountriesWithDishes
- [x] 2.4 Implement localStorage read on mount (key: `cooking-world-map-dishes`) with fallback to empty array on parse failure
- [x] 2.5 Implement localStorage write on every mutation (addDish, deleteDish) with try/catch error handling
- [x] 2.6 Implement input validation: reject empty and whitespace-only dish names in addDish
- [x] 2.7 Write property-based tests for DishStore (Properties 2, 3, 5, 6) using fast-check with minimum 100 iterations each

## Task 3: Interactive World Map (MapView Component)

- [x] 3.1 Create MapView component with Leaflet MapContainer, TileLayer (OpenStreetMap), and GeoJSON layer
- [x] 3.2 Load GeoJSON countries data and render as interactive polygon layer
- [x] 3.3 Implement per-feature style function: highlighted fill for countries with dishes, default fill for others
- [x] 3.4 Implement per-feature onClick handler: extract ISO_A3 code and country name, call onCountrySelect prop
- [x] 3.5 Configure map with zoom and drag enabled, no restrictive maxBounds
- [x] 3.6 Write property-based test for style function (Property 1) using fast-check
- [x] 3.7 Write unit tests for map rendering and country click handling

## Task 4: Country Panel and Dish List

- [x] 4.1 Create CountryPanel component as a slide-in side panel with country name header and close button
- [x] 4.2 Create DishList component displaying dishes for the selected country with delete button per dish
- [x] 4.3 Implement delete confirmation flow: prompt user before removing a dish
- [x] 4.4 Wire CountryPanel to DishStore context for reading dishes and deleting
- [x] 4.5 Write unit tests for CountryPanel rendering, dish display, and delete interaction

## Task 5: Dish Form and Autocomplete

- [x] 5.1 Create AutocompleteInput component with text input and dropdown suggestion list
- [x] 5.2 Implement autocomplete filter function: case-insensitive substring match against all dish names
- [x] 5.3 Implement suggestion selection via click and keyboard (arrow keys + Enter)
- [x] 5.4 Create DishForm component wrapping AutocompleteInput with submit handling and validation message display
- [x] 5.5 Wire DishForm to DishStore context for adding dishes and fetching all dish names
- [x] 5.6 Write property-based test for autocomplete filter function (Property 4) using fast-check
- [x] 5.7 Write unit tests for form submission, validation message, and autocomplete selection

## Task 6: App Shell Integration

- [x] 6.1 Create App root component with DishStoreProvider, MapView, and conditional CountryPanel rendering
- [x] 6.2 Implement selected country state management: set on country click, clear on panel close
- [x] 6.3 Pass countriesWithDishes from DishStore to MapView for highlight styling
- [x] 6.4 Verify end-to-end flow: click country → panel opens → add dish → map updates highlight → delete dish → map updates

## Task 7: PWA Configuration

- [x] 7.1 Configure vite-plugin-pwa in vite.config.ts with manifest (name, icons, theme_color, display: standalone)
- [x] 7.2 Add PWA icons (192x192 and 512x512) to public directory
- [x] 7.3 Configure service worker with precaching for static assets (HTML, JS, CSS, GeoJSON)
- [x] 7.4 Write smoke tests verifying manifest fields and service worker configuration

## Task 8: Styling and Responsiveness

- [x] 8.1 Style MapView to fill the viewport with proper Leaflet CSS imports
- [x] 8.2 Style CountryPanel as a responsive slide-in panel (side panel on desktop, bottom sheet on mobile)
- [x] 8.3 Style DishForm and AutocompleteInput with accessible focus states and dropdown positioning
- [x] 8.4 Style DishList with clear dish items and delete button affordance
- [x] 8.5 Ensure touch-friendly tap targets (minimum 44x44px) for mobile use
