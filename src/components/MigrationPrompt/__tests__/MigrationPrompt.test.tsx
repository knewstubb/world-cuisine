import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MigrationPrompt from '../MigrationPrompt';

const LEGACY_KEY = 'cooking-world-map-dishes';

// Mock supabase
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { household_id: 'hh-1' } }),
          in: vi.fn().mockResolvedValue({ data: [] }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('MigrationPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('does not render when no legacy data exists', () => {
    render(<MigrationPrompt />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders migration prompt when legacy data exists', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ id: '1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01' }])
    );
    render(<MigrationPrompt />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Migrate Your Data')).toBeInTheDocument();
    expect(screen.getByText('Migrate Data')).toBeInTheDocument();
    expect(screen.getByText('Not Now')).toBeInTheDocument();
  });

  it('hides prompt when dismissed without clearing localStorage', async () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([{ id: '1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01' }])
    );
    render(<MigrationPrompt />);

    await userEvent.click(screen.getByText('Not Now'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // localStorage should still have the data
    expect(localStorage.getItem(LEGACY_KEY)).not.toBeNull();
  });

  it('shows progress during migration', async () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify([
        { id: '1', name: 'Pad Thai', countryCode: 'THA', createdAt: '2024-01-01' },
        { id: '2', name: 'Sushi', countryCode: 'JPN', createdAt: '2024-01-02' },
      ])
    );
    render(<MigrationPrompt />);

    await userEvent.click(screen.getByText('Migrate Data'));

    await waitFor(() => {
      expect(screen.getByText('Migration Complete!')).toBeInTheDocument();
    });
  });
});
