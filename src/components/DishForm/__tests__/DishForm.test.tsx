import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DishForm from '../DishForm';

// Mock the SyncStatusProvider
const mockAddDishEntry = vi.fn();
const mockUploadPhoto = vi.fn();

vi.mock('../../../providers/SyncStatusProvider', () => ({
  useSyncStatus: () => ({
    isOnline: true,
    pendingCount: 0,
    addDishEntry: mockAddDishEntry,
    deleteDishEntry: vi.fn(),
    getDishEntriesForCountry: () => [],
    getCountriesWithDishes: () => new Set<string>(),
    getSuggestionsForCountry: () => [],
    uploadPhoto: mockUploadPhoto,
  }),
}));

function renderDishForm(countryCode = 'THA', onDishAdded = vi.fn()) {
  return {
    onDishAdded,
    ...render(<DishForm countryCode={countryCode} onDishAdded={onDishAdded} />),
  };
}

describe('DishForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDishEntry.mockResolvedValue({
      id: 'test-id',
      household_id: 'hh-1',
      country_code: 'THA',
      name: 'Test Dish',
      rating: 5,
      photo_path: null,
      ingredients: [],
      notes: null,
      recipe_link: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'user-1',
      sync_status: 'synced',
    });
  });

  it('renders the form with all fields', () => {
    renderDishForm();
    expect(screen.getByRole('form', { name: /add a dish/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/dish name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ingredients/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipe link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add dish/i })).toBeInTheDocument();
  });

  it('shows validation error when submitting with empty name', async () => {
    renderDishForm();
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));
    expect(screen.getByText(/dish name is required/i)).toBeInTheDocument();
  });

  it('shows validation error when submitting without rating', async () => {
    renderDishForm();
    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pad Thai');
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));
    expect(screen.getByText(/rating is required/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid recipe link', async () => {
    renderDishForm();
    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pad Thai');
    await userEvent.type(screen.getByLabelText(/rating/i), '7');
    await userEvent.type(screen.getByLabelText(/recipe link/i), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));
    expect(screen.getByText(/recipe link must start with/i)).toBeInTheDocument();
  });

  it('shows validation error for notes exceeding 1000 characters', async () => {
    renderDishForm();
    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pad Thai');
    await userEvent.type(screen.getByLabelText(/rating/i), '7');

    const longNotes = 'a'.repeat(1001);
    // Use paste to avoid slow character-by-character typing
    const notesInput = screen.getByLabelText(/notes/i);
    await userEvent.click(notesInput);
    await userEvent.paste(longNotes);

    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));
    expect(screen.getByText(/notes must be 1000 characters or fewer/i)).toBeInTheDocument();
  });

  it('clears validation errors when user corrects input', async () => {
    renderDishForm();
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));
    expect(screen.getByText(/dish name is required/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pad Thai');
    expect(screen.queryByText(/dish name is required/i)).not.toBeInTheDocument();
  });

  it('submits successfully with valid required fields and calls onDishAdded', async () => {
    const onDishAdded = vi.fn();
    renderDishForm('THA', onDishAdded);

    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pad Thai');
    await userEvent.type(screen.getByLabelText(/rating/i), '8');
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));

    await waitFor(() => {
      expect(mockAddDishEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          country_code: 'THA',
          name: 'Pad Thai',
          rating: 8,
          photo_path: null,
          ingredients: [],
          notes: null,
          recipe_link: null,
        }),
        undefined,
      );
    });

    await waitFor(() => {
      expect(onDishAdded).toHaveBeenCalledTimes(1);
    });
  });

  it('clears form on successful submission', async () => {
    renderDishForm();

    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pad Thai');
    await userEvent.type(screen.getByLabelText(/rating/i), '8');
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/dish name/i)).toHaveValue('');
    });
  });

  it('submits with all optional fields filled', async () => {
    const onDishAdded = vi.fn();
    renderDishForm('ITA', onDishAdded);

    await userEvent.type(screen.getByLabelText(/dish name/i), 'Pasta Carbonara');
    await userEvent.type(screen.getByLabelText(/rating/i), '9');
    await userEvent.type(screen.getByLabelText(/ingredients/i), 'pasta, eggs, pecorino');
    await userEvent.type(screen.getByLabelText(/notes/i), 'Delicious!');
    await userEvent.type(screen.getByLabelText(/recipe link/i), 'https://example.com/carbonara');
    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));

    await waitFor(() => {
      expect(mockAddDishEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          country_code: 'ITA',
          name: 'Pasta Carbonara',
          rating: 9,
          photo_path: null,
          ingredients: ['pasta', 'eggs', 'pecorino'],
          notes: 'Delicious!',
          recipe_link: 'https://example.com/carbonara',
        }),
        undefined,
      );
    });
  });

  it('shows photo upload error with retry and skip options when upload fails', async () => {
    mockUploadPhoto.mockRejectedValueOnce(new Error('Upload failed'));

    renderDishForm();

    await userEvent.type(screen.getByLabelText(/dish name/i), 'Sushi');
    await userEvent.type(screen.getByLabelText(/rating/i), '10');

    // Simulate selecting a photo file
    const file = new File(['photo'], 'sushi.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/select photo/i);
    await userEvent.upload(fileInput, file);

    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));

    await waitFor(() => {
      expect(screen.getByText(/photo upload failed/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry upload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit without photo/i })).toBeInTheDocument();
  });

  it('submits without photo when user clicks skip after upload failure', async () => {
    mockUploadPhoto.mockRejectedValueOnce(new Error('Upload failed'));
    const onDishAdded = vi.fn();

    renderDishForm('JPN', onDishAdded);

    await userEvent.type(screen.getByLabelText(/dish name/i), 'Sushi');
    await userEvent.type(screen.getByLabelText(/rating/i), '10');

    const file = new File(['photo'], 'sushi.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/select photo/i);
    await userEvent.upload(fileInput, file);

    await userEvent.click(screen.getByRole('button', { name: /add dish/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit without photo/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /submit without photo/i }));

    await waitFor(() => {
      expect(mockAddDishEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sushi',
          photo_path: null,
        }),
        undefined,
      );
    });

    await waitFor(() => {
      expect(onDishAdded).toHaveBeenCalledTimes(1);
    });
  });
});
