import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import MapView, { getCountryStyle } from '../MapView';

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
      // Render each feature as a clickable element for testing
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
    {
      type: 'Feature',
      properties: { ISO_A3: 'JPN', ADMIN: 'Japan', NAME: 'Japan' },
      geometry: { type: 'Polygon', coordinates: [[[139, 35], [140, 35], [140, 36], [139, 35]]] },
    },
  ],
};

describe('MapView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders MapContainer and TileLayer after GeoJSON loads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoJSON),
    } as Response);

    render(
      <MapView onCountrySelect={vi.fn()} countriesWithDishes={new Set()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer').dataset.url).toContain('openstreetmap');
  });

  it('renders GeoJSON layer with country features', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoJSON),
    } as Response);

    render(
      <MapView onCountrySelect={vi.fn()} countriesWithDishes={new Set()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('geojson-layer')).toBeInTheDocument();
    });

    expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    expect(screen.getByTestId('feature-ITA')).toBeInTheDocument();
    expect(screen.getByTestId('feature-JPN')).toBeInTheDocument();
  });

  it('calls onCountrySelect with code and name when a country is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoJSON),
    } as Response);

    const onCountrySelect = vi.fn();
    render(
      <MapView onCountrySelect={onCountrySelect} countriesWithDishes={new Set()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    });

    screen.getByTestId('feature-THA').click();

    expect(onCountrySelect).toHaveBeenCalledWith({ code: 'THA', name: 'Thailand' });
  });

  it('applies highlighted style to countries with dishes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGeoJSON),
    } as Response);

    render(
      <MapView onCountrySelect={vi.fn()} countriesWithDishes={new Set(['THA'])} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('feature-THA')).toBeInTheDocument();
    });

    expect(screen.getByTestId('feature-THA').dataset.fillColor).toBe('#e07b39');
    expect(screen.getByTestId('feature-ITA').dataset.fillColor).toBe('#d4e6f1');
  });

  it('shows error message when GeoJSON fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    render(
      <MapView onCountrySelect={vi.fn()} countriesWithDishes={new Set()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/Error loading map data/)).toBeInTheDocument();
  });
});

describe('getCountryStyle (unit)', () => {
  it('returns highlighted style for a country in the set', () => {
    const style = getCountryStyle(new Set(['USA']), 'USA');
    expect(style.fillColor).toBe('#e07b39');
    expect(style.fillOpacity).toBe(0.6);
  });

  it('returns default style for a country not in the set', () => {
    const style = getCountryStyle(new Set(['USA']), 'CAN');
    expect(style.fillColor).toBe('#d4e6f1');
    expect(style.fillOpacity).toBe(0.4);
  });

  it('returns default style for empty set', () => {
    const style = getCountryStyle(new Set(), 'USA');
    expect(style.fillColor).toBe('#d4e6f1');
  });
});
