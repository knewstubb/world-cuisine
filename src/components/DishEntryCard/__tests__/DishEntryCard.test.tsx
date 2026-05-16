import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DishEntryCard from '../DishEntryCard';
import type { DishEntry } from '../../../types/DishEntry';

vi.mock('../../../lib/thumbnailUrl', () => ({
  getThumbnailUrl: (path: string) => `https://example.com/storage/${path}?width=400`,
}));

function createEntry(overrides: Partial<DishEntry> = {}): DishEntry {
  return {
    id: 'entry-1',
    household_id: 'hh-1',
    country_code: 'THA',
    name: 'Pad Thai',
    rating: 8,
    photo_path: null,
    ingredients: [],
    notes: null,
    recipe_link: null,
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
    created_by: 'user-1',
    sync_status: 'synced',
    ...overrides,
  };
}

describe('DishEntryCard', () => {
  describe('Summary view', () => {
    it('renders dish name', () => {
      render(
        <DishEntryCard entry={createEntry()} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.getByText('Pad Thai')).toBeInTheDocument();
    });

    it('renders rating as X/10', () => {
      render(
        <DishEntryCard entry={createEntry({ rating: 8 })} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.getByText('8/10')).toBeInTheDocument();
    });

    it('renders creation date in locale format', () => {
      render(
        <DishEntryCard entry={createEntry()} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      const expectedDate = new Date('2024-03-15T10:00:00Z').toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    it('renders photo thumbnail when photo_path is set', () => {
      render(
        <DishEntryCard
          entry={createEntry({ photo_path: 'hh-1/entry-1.jpg' })}
          onDelete={vi.fn()}
          expanded={false}
          onToggle={vi.fn()}
        />,
      );
      const img = screen.getByAltText('Photo of Pad Thai');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/storage/hh-1/entry-1.jpg?width=400');
      expect(img).toHaveAttribute('width', '80');
      expect(img).toHaveAttribute('height', '80');
    });

    it('renders placeholder when no photo', () => {
      render(
        <DishEntryCard entry={createEntry()} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.getByLabelText('No photo available')).toBeInTheDocument();
    });

    it('does not render rating when null (migrated entries)', () => {
      render(
        <DishEntryCard entry={createEntry({ rating: null })} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.queryByText(/\/10/)).not.toBeInTheDocument();
    });
  });

  describe('Sync status indicator', () => {
    it('shows pending badge when sync_status is pending', () => {
      render(
        <DishEntryCard entry={createEntry({ sync_status: 'pending' })} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.getByLabelText('Sync status: pending')).toBeInTheDocument();
    });

    it('shows error badge when sync_status is error', () => {
      render(
        <DishEntryCard entry={createEntry({ sync_status: 'error' })} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.getByLabelText('Sync status: error')).toBeInTheDocument();
    });

    it('does not show badge when sync_status is synced', () => {
      render(
        <DishEntryCard entry={createEntry({ sync_status: 'synced' })} onDelete={vi.fn()} expanded={false} onToggle={vi.fn()} />,
      );
      expect(screen.queryByLabelText(/sync status/i)).not.toBeInTheDocument();
    });
  });

  describe('Expand/collapse', () => {
    it('calls onToggle when card is clicked', async () => {
      const onToggle = vi.fn();
      render(
        <DishEntryCard entry={createEntry()} onDelete={vi.fn()} expanded={false} onToggle={onToggle} />,
      );
      await userEvent.click(screen.getByRole('button', { name: /pad thai/i }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('does not show details when collapsed', () => {
      render(
        <DishEntryCard
          entry={createEntry({ ingredients: ['noodles', 'shrimp'], notes: 'Great dish' })}
          onDelete={vi.fn()}
          expanded={false}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.queryByText('Ingredients')).not.toBeInTheDocument();
      expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    });

    it('shows ingredients when expanded and ingredients exist', () => {
      render(
        <DishEntryCard
          entry={createEntry({ ingredients: ['noodles', 'shrimp', 'peanuts'] })}
          onDelete={vi.fn()}
          expanded={true}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.getByText('Ingredients')).toBeInTheDocument();
      expect(screen.getByText('noodles')).toBeInTheDocument();
      expect(screen.getByText('shrimp')).toBeInTheDocument();
      expect(screen.getByText('peanuts')).toBeInTheDocument();
    });

    it('shows notes when expanded and notes exist', () => {
      render(
        <DishEntryCard
          entry={createEntry({ notes: 'Very spicy, reduce chili next time' })}
          onDelete={vi.fn()}
          expanded={true}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Very spicy, reduce chili next time')).toBeInTheDocument();
    });

    it('shows recipe link when expanded and recipe_link exists', () => {
      render(
        <DishEntryCard
          entry={createEntry({ recipe_link: 'https://example.com/pad-thai' })}
          onDelete={vi.fn()}
          expanded={true}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.getByText('Recipe')).toBeInTheDocument();
      const link = screen.getByRole('link', { name: /view recipe/i });
      expect(link).toHaveAttribute('href', 'https://example.com/pad-thai');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('omits ingredients section when ingredients array is empty', () => {
      render(
        <DishEntryCard
          entry={createEntry({ ingredients: [], notes: 'Some notes' })}
          onDelete={vi.fn()}
          expanded={true}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.queryByText('Ingredients')).not.toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('omits notes section when notes is null', () => {
      render(
        <DishEntryCard
          entry={createEntry({ notes: null, ingredients: ['rice'] })}
          onDelete={vi.fn()}
          expanded={true}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.queryByText('Notes')).not.toBeInTheDocument();
      expect(screen.getByText('Ingredients')).toBeInTheDocument();
    });

    it('omits recipe section when recipe_link is null', () => {
      render(
        <DishEntryCard
          entry={createEntry({ recipe_link: null, notes: 'Good' })}
          onDelete={vi.fn()}
          expanded={true}
          onToggle={vi.fn()}
        />,
      );
      expect(screen.queryByText('Recipe')).not.toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  describe('Delete action', () => {
    it('calls onDelete with entry id when delete is confirmed', async () => {
      const onDelete = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <DishEntryCard entry={createEntry()} onDelete={onDelete} expanded={true} onToggle={vi.fn()} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /delete pad thai/i }));
      expect(onDelete).toHaveBeenCalledWith('entry-1');
    });

    it('does not call onDelete when delete is cancelled', async () => {
      const onDelete = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <DishEntryCard entry={createEntry()} onDelete={onDelete} expanded={true} onToggle={vi.fn()} />,
      );

      await userEvent.click(screen.getByRole('button', { name: /delete pad thai/i }));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
