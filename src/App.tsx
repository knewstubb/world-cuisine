import { useState, useCallback } from 'react';
import { SyncStatusProvider, useSyncStatus } from './providers/SyncStatusProvider';
import AuthGate from './components/AuthGate/AuthGate';
import MapView from './components/MapView/MapView';
import CountryPanel from './components/CountryPanel/CountryPanel';
import OfflineIndicator from './components/OfflineIndicator/OfflineIndicator';
import MigrationPrompt from './components/MigrationPrompt/MigrationPrompt';
import { supabase } from './lib/supabase';
import { clearAllOfflineData } from './lib/offlineQueue';
import styles from './App.module.css';

function AppContent() {
  const [selectedCountry, setSelectedCountry] = useState<{
    code: string;
    name: string;
  } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const { getCountriesWithDishes } = useSyncStatus();
  const countriesWithDishes = getCountriesWithDishes();

  const handleCountrySelect = useCallback(
    (country: { code: string; name: string }) => {
      setSelectedCountry(country);
    },
    [],
  );

  const handlePanelClose = useCallback(() => {
    setSelectedCountry(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await clearAllOfflineData();
    } finally {
      setSigningOut(false);
    }
  }, []);

  return (
    <div className={styles.app}>
      <OfflineIndicator />
      <MigrationPrompt />
      <header className={styles.header}>
        <span className={styles.headerTitle}>Cooking World Map</span>
        <button
          className={styles.signOutButton}
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sign out"
        >
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </header>
      <div className={styles.content}>
        <MapView
          onCountrySelect={handleCountrySelect}
          countriesWithDishes={countriesWithDishes}
        />
        {selectedCountry && (
          <CountryPanel country={selectedCountry} onClose={handlePanelClose} />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SyncStatusProvider>
      <AuthGate>
        <AppContent />
      </AuthGate>
    </SyncStatusProvider>
  );
}
