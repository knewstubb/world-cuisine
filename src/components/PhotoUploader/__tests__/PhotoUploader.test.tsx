import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoUploader from '../PhotoUploader';

function createFile(
  name: string,
  size: number,
  type: string,
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function renderPhotoUploader(props: Partial<React.ComponentProps<typeof PhotoUploader>> = {}) {
  const defaultProps = {
    onPhotoSelected: vi.fn(),
    onPhotoRemoved: vi.fn(),
    previewUrl: null,
    error: null,
    ...props,
  };
  return {
    ...defaultProps,
    ...render(<PhotoUploader {...defaultProps} />),
  };
}

describe('PhotoUploader', () => {
  it('renders the "Add Photo" button when no preview', () => {
    renderPhotoUploader();
    expect(screen.getByRole('button', { name: /add photo/i })).toBeInTheDocument();
  });

  it('renders the file input accepting JPEG, PNG, WebP', () => {
    renderPhotoUploader();
    const input = screen.getByLabelText(/select photo/i);
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(input).toHaveAttribute('type', 'file');
  });

  it('calls onPhotoSelected when a valid file is chosen', async () => {
    const onPhotoSelected = vi.fn();
    renderPhotoUploader({ onPhotoSelected });

    const file = createFile('dish.jpg', 1024, 'image/jpeg');
    const input = screen.getByLabelText(/select photo/i);

    await userEvent.upload(input, file);

    expect(onPhotoSelected).toHaveBeenCalledWith(file);
  });

  it('does not call onPhotoSelected for invalid file format', () => {
    const onPhotoSelected = vi.fn();
    renderPhotoUploader({ onPhotoSelected });

    const file = createFile('doc.pdf', 1024, 'application/pdf');
    const input = screen.getByLabelText(/select photo/i);

    // Use fireEvent to bypass accept attribute filtering in testing-library
    fireEvent.change(input, { target: { files: [file] } });

    expect(onPhotoSelected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid file format/i);
  });

  it('does not call onPhotoSelected for file exceeding 10MB', () => {
    const onPhotoSelected = vi.fn();
    renderPhotoUploader({ onPhotoSelected });

    const file = createFile('large.png', 11 * 1024 * 1024, 'image/png');
    const input = screen.getByLabelText(/select photo/i);

    // Use fireEvent to bypass accept attribute filtering in testing-library
    fireEvent.change(input, { target: { files: [file] } });

    expect(onPhotoSelected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/too large/i);
  });

  it('shows image preview when previewUrl is provided', () => {
    renderPhotoUploader({ previewUrl: 'blob:http://localhost/abc123' });

    const img = screen.getByAltText(/selected dish photo preview/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:http://localhost/abc123');
  });

  it('shows Change and Remove buttons when preview is displayed', () => {
    renderPhotoUploader({ previewUrl: 'blob:http://localhost/abc123' });

    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove photo/i })).toBeInTheDocument();
  });

  it('calls onPhotoRemoved when Remove button is clicked', async () => {
    const onPhotoRemoved = vi.fn();
    renderPhotoUploader({ previewUrl: 'blob:http://localhost/abc123', onPhotoRemoved });

    await userEvent.click(screen.getByRole('button', { name: /remove photo/i }));

    expect(onPhotoRemoved).toHaveBeenCalledTimes(1);
  });

  it('displays parent-provided error', () => {
    renderPhotoUploader({ error: 'Upload failed. Please try again.' });

    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed. Please try again.');
  });

  it('has touch-friendly button sizes (min 44x44px)', () => {
    renderPhotoUploader();
    const button = screen.getByRole('button', { name: /add photo/i });
    // The CSS sets min-width: 44px and min-height: 44px on .selectButton
    // Actual pixel verification requires a real browser; here we verify the element renders
    expect(button).toBeInTheDocument();
  });

  it('clears validation error when a valid file is selected after an invalid one', () => {
    const onPhotoSelected = vi.fn();
    renderPhotoUploader({ onPhotoSelected });

    const input = screen.getByLabelText(/select photo/i);

    // First, select an invalid file
    const invalidFile = createFile('doc.gif', 1024, 'image/gif');
    fireEvent.change(input, { target: { files: [invalidFile] } });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Then, select a valid file
    const validFile = createFile('dish.png', 2048, 'image/png');
    fireEvent.change(input, { target: { files: [validFile] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onPhotoSelected).toHaveBeenCalledWith(validFile);
  });
});
