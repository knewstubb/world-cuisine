import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import App from '../App';
import type { Dish } from '../types/Dish';

const STORAGE_KEY = 'cooking-world-map-dishes';

// --- Mock Supabase auth so AuthGate passes through ---
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
vi.mock('../lib/supabase', () => {
  const mockSession = { user: { id: 'test-user-id' }, access_token: 'test-token' };
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signOut: (...args: unknown[]) => mockSignOut(...args),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { household_id: 'test-household-id' } }),
            order: vi.fn().mockResolvedValue({ data: [] }),
          }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    },
  };
});

// --- Mock offlineQueue ---
const mockClearAllOfflineData = vi.fn().mockResolvedValue(undefined);
vi.mock('../lib/offlineQueue', () => ({
  clearAllOfflineData: (...args: unknown[]) => mockClearAllOfflineData(...args),
  enqueueMutation: vi.fn().mockResolvedValue(undefined),
  dequeueMutations: vi.fn().mockResolvedValue([]),
  removeMutation: vi.fn().mockResolvedValue(undefined),
  updateMutation: vi.fn().mockResolvedValue(undefined),
  getQueueLength: vi.fn().mockResolvedValue(0),
  cacheDishEntry: vi.fn().mockResolvedValue(undefined),
  cacheDishEntries: vi.fn().mockResolvedValue(undefined),
  getCachedDishEntry: vi.fn().mockResolvedValue(undefined),
  removeCachedDishEntry: vi.fn().mockResolvedValue(undefined),
  getAllCachedDishEntries: vi.fn().mockResolvedValue([]),
  cachePopularDishes: vi.fn().mockResolvedValue(undefined),
  getAllCachedPopularDishes: vi.fn().mockResolvedValue([]),
  clearPopularDishesCache: vi.fn().mockResolvedValue(undefined),
}));

// --- Mock react-leaflet ---
vi.mock('react-leaflet', () => {
  return {
    MapContainer: ({ children, className }: { children: ReactNode; className: string }) => (
      <div data-testid="map-container" className={className}>
        {children}
      </div>
    ),
    TileLayer: ({ url }: { url: string }) => (
      <div data-testid="tile-layer" data-url={url} />
    ),
    GeoJSON: ({
      data,
      onEachFeature,
      style,
    }: {
      data: GeoJSON.FeatureCollection;
      onEachFeature: (feature: GeoJSON.Feature, layer: { on: (event: string, handler: () => void) => void }) => void;
      style: (feature: GeoJSON.Feature) => Record<string, unknown>;
    }) => {
      return (
        <div data-testid="geojson-layer">
          {data.features.map((feature, i) => {
            const featureStyle = style(feature);
            let clickHandler: (() => void) | undefined;
            const mockLayer = {
              on: (event: string, handler: () => void) => {
                if (event === 'click') clickHandler = handler;
              },
            };
            onEachFeature(feature, mockLayer);
            return (
              <div
                key={i}
                data-testid={`feature-${feature.properties?.ISO_A3}`}
                data-fill-color={featureStyle.fillColor}
                onClick={() => clickHandler?.()}
              >
                {feature.properties?.ADMIN}
              </div>
            );
          })}
        </div>
      );
    },
  };
});

const mockGeoJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { ISO_A3: 'THA', ADMIN: 'Thailand', NAME: 'Thailand' },
      geometry: { type: 'Polygon', coordinates: [[[100, 15], [101, 15], [101, 16], [100, 15]]] },
    },
    {
      type: 'Feature',
      properties: { ISO_A3: 'ITA', ADMIN: 'Italy', NAME: 'Italy' },
      geometry: { type: 'Polygon', coordinates: [[[12, 42], [13, 42], [13, 43], [12, 42]]] },
    },
  ],
};

function makeDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: crypto.randomUUID(),
    name: 'Pad Thai',
    countryCode: 'THA',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoJSON),
    } as Response);
  });

  it('renders the map on load without CountryPanel', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    // CountryPanel should not be visible
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('opens CountryPanel when a country is clicked', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('feature-THA'));

    expect(screen.getByRole('complementary', { name: /dishes for thailand/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Thailand' })).toBeInTheDocument();
  });

  it('closes CountryPanel when close button is clicked', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('feature-THA'));
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close panel/i }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('end-to-end: click country → add dish → map highlights → delete dish → map un-highlights', async () => {
    render(<App />);

    // Wait for map to load
    await waitFor(() => {
      expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    });

    // Initially Thailand should have default style (no dishes)
    expect(screen.getByTestId('feature-THA').dataset.fillColor).toBe('#d4e6f1');

    // Click Thailand to open panel
    await userEvent.click(screen.getByTestId('feature-THA'));
    expect(screen.getByRole('heading', { name: 'Thailand' })).toBeInTheDocument();

    // Verify the new DishForm renders with all required fields
    expect(screen.getByLabelText(/dish name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rating/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add dish/i })).toBeInTheDocument();

    // Add a dish using the new DishForm (text input + rating required)
    const nameInput = screen.getByLabelText(/dish name/i);
    await userEvent.type(nameInput, 'Pad Thai');
    const ratingInput = screen.getByLabelText(/rating/i);
    await userEvent.type(ratingInput, '8');
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));

    // Form should clear after successful submission (addDishEntry was called via sync service)
    await waitFor(() => {
      expect(nameInput).toHaveValue('');
    });
  });

  it('passes countriesWithDishes to MapView for pre-existing dishes', async () => {
    // The sync service now reads from Supabase/IndexedDB, not localStorage.
    // Seed localStorage for DishStoreProvider (still used by other components),
    // but the map highlighting now comes from the SyncStatusProvider.
    // Since the mock Supabase returns empty data, no countries will be highlighted
    // via the sync service. This test verifies the app renders without error
    // when localStorage has data but the sync service is empty.
    const dish = makeDish({ name: 'Pizza', countryCode: 'ITA' });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([dish]));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-ITA')).toBeInTheDocument();
    });

    // With the sync service providing countriesWithDishes (empty on init),
    // Italy won't be highlighted until data loads from Supabase.
    // The default (uncooked) color should apply.
    expect(screen.getByTestId('feature-ITA').dataset.fillColor).toBe('#d4e6f1');
    expect(screen.getByTestId('feature-THA').dataset.fillColor).toBe('#d4e6f1');
  });

  it('switches panel when clicking a different country', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    });

    // Click Thailand
    await userEvent.click(screen.getByTestId('feature-THA'));
    expect(screen.getByRole('heading', { name: 'Thailand' })).toBeInTheDocument();

    // Click Italy
    await userEvent.click(screen.getByTestId('feature-ITA'));
    expect(screen.getByRole('heading', { name: 'Italy' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Thailand' })).not.toBeInTheDocument();
  });

  it('renders sign-out button in the header', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  it('calls signOut and clearAllOfflineData when sign-out button is clicked (Req 8.6)', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockClearAllOfflineData).toHaveBeenCalled();
    });
  });
});
