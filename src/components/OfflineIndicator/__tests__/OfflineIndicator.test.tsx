import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OfflineIndicator from '../OfflineIndicator';

// Mock the useSyncStatus hook
vi.mock('../../../providers/SyncStatusProvider', () => ({
  useSyncStatus: vi.fn(),
}));

import { useSyncStatus } from '../../../providers/SyncStatusProvider';

const mockUseSyncStatus = vi.mocked(useSyncStatus);

function mockSyncStatus(overrides: Partial<ReturnType<typeof useSyncStatus>>) {
  mockUseSyncStatus.mockReturnValue({
    isOnline: true,
    pendingCount: 0,
    addDishEntry: vi.fn(),
    deleteDishEntry: vi.fn(),
    getDishEntriesForCountry: vi.fn().mockReturnValue([]),
    getCountriesWithDishes: vi.fn().mockReturnValue(new Set()),
    getSuggestionsForCountry: vi.fn().mockReturnValue([]),
    uploadPhoto: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useSyncStatus>);
}

describe('OfflineIndicator', () => {
  it('renders nothing when online and no pending items', () => {
    mockSyncStatus({ isOnline: true, pendingCount: 0 });
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline banner when navigator is offline', () => {
    mockSyncStatus({ isOnline: false, pendingCount: 0 });
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('shows syncing banner when online with pending items', () => {
    mockSyncStatus({ isOnline: true, pendingCount: 3 });
    render(<OfflineIndicator />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
    expect(screen.getByText(/3 items remaining/i)).toBeInTheDocument();
  });

  it('shows singular "item" when pendingCount is 1', () => {
    mockSyncStatus({ isOnline: true, pendingCount: 1 });
    render(<OfflineIndicator />);
    expect(screen.getByText(/1 item remaining/i)).toBeInTheDocument();
  });

  it('shows offline banner even when there are pending items', () => {
    mockSyncStatus({ isOnline: false, pendingCount: 5 });
    render(<OfflineIndicator />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });
});
