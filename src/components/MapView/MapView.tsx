import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import type { PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';

interface MapViewProps {
  onCountrySelect: (country: { code: string; name: string }) => void;
  countriesWithDishes: Set<string>;
}

const HIGHLIGHTED_STYLE: PathOptions = {
  fillColor: '#e07b39',
  fillOpacity: 0.6,
  color: '#b85a1f',
  weight: 2,
};

const DEFAULT_STYLE: PathOptions = {
  fillColor: '#d4e6f1',
  fillOpacity: 0.4,
  color: '#7fb3d8',
  weight: 1,
};

/**
 * Pure style function exported for property-based testing.
 * Returns highlighted style if the country code is in the set, default otherwise.
 */
export function getCountryStyle(
  countriesWithDishes: Set<string>,
  countryCode: string,
): PathOptions {
  if (countriesWithDishes.has(countryCode)) {
    return HIGHLIGHTED_STYLE;
  }
  return DEFAULT_STYLE;
}

export default function MapView({ onCountrySelect, countriesWithDishes }: MapViewProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/ne_110m_countries.geojson')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
        return res.json() as Promise<FeatureCollection>;
      })
      .then(setGeoData)
      .catch((err: Error) => {
        setError(err.message);
      });
  }, []);

  function styleFeature(feature: Feature<Geometry> | undefined): PathOptions {
    const code = feature?.properties?.ISO_A3 ?? '';
    return getCountryStyle(countriesWithDishes, code);
  }

  function onEachFeature(feature: Feature<Geometry>, layer: L.Layer) {
    layer.on('click', () => {
      const code: string = feature.properties?.ISO_A3 ?? '';
      const name: string = feature.properties?.ADMIN ?? feature.properties?.NAME ?? '';
      if (code) {
        onCountrySelect({ code, name });
      }
    });
  }

  if (error) {
    return (
      <div className={styles.mapContainer} role="alert">
        <p>Error loading map data: {error}</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className={styles.mapContainer}
      scrollWheelZoom={true}
      dragging={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {geoData && (
        <GeoJSON
          data={geoData}
          style={styleFeature}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
}
