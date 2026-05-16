import { createContext, useContext, type ReactNode } from 'react';
import { useSyncService, type SyncServiceValue } from '../hooks/useSyncService';

const SyncStatusContext = createContext<SyncServiceValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const syncService = useSyncService();

  return (
    <SyncStatusContext.Provider value={syncService}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncServiceValue {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return ctx;
}
