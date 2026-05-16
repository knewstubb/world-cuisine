import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadPhoto } from '../photoUpload';

const mockUpload = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  },
}));

function createMockFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('uploadPhoto', () => {
  beforeEach(() => {
    mockUpload.mockReset();
  });

  it('uploads a JPEG file to the correct path', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const file = createMockFile('photo.jpg', 1024, 'image/jpeg');

    const result = await uploadPhoto(file, 'household-123', 'dish-456');

    expect(result).toBe('household-123/dish-456.jpg');
    expect(mockUpload).toHaveBeenCalledWith(
      'household-123/dish-456.jpg',
      file,
      { contentType: 'image/jpeg', upsert: true }
    );
  });

  it('uploads a PNG file with correct extension', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const file = createMockFile('photo.png', 2048, 'image/png');

    const result = await uploadPhoto(file, 'hh-abc', 'entry-xyz');

    expect(result).toBe('hh-abc/entry-xyz.png');
  });

  it('uploads a WebP file with correct extension', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const file = createMockFile('photo.webp', 512, 'image/webp');

    const result = await uploadPhoto(file, 'hh-1', 'dish-2');

    expect(result).toBe('hh-1/dish-2.webp');
  });

  it('throws an error for unsupported file types', async () => {
    const file = createMockFile('animation.gif', 1024, 'image/gif');

    await expect(uploadPhoto(file, 'hh-1', 'dish-2')).rejects.toThrow(
      'Unsupported file type "image/gif"'
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('throws an error when Supabase upload fails', async () => {
    mockUpload.mockResolvedValue({
      error: { message: 'Bucket not found' },
    });
    const file = createMockFile('photo.jpg', 1024, 'image/jpeg');

    await expect(uploadPhoto(file, 'hh-1', 'dish-2')).rejects.toThrow(
      'Photo upload failed: Bucket not found'
    );
  });

  it('returns only the storage path, not a full URL', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const file = createMockFile('photo.png', 1024, 'image/png');

    const result = await uploadPhoto(file, 'my-household', 'my-dish');

    expect(result).not.toContain('http');
    expect(result).toBe('my-household/my-dish.png');
  });
});
