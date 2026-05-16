import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getThumbnailUrl } from '../thumbnailUrl';

describe('getThumbnailUrl', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test-project.supabase.co');
  });

  it('constructs a thumbnail URL with the correct base URL, path, and width parameter', () => {
    const url = getThumbnailUrl('household-123/dish-456.jpg');

    expect(url).toBe(
      'https://test-project.supabase.co/storage/v1/render/image/authenticated/dish-photos/household-123/dish-456.jpg?width=400'
    );
  });

  it('includes the storage render path for authenticated access', () => {
    const url = getThumbnailUrl('abc/photo.png');

    expect(url).toContain('/storage/v1/render/image/authenticated/dish-photos/');
  });

  it('appends width=400 transform parameter', () => {
    const url = getThumbnailUrl('any/path.webp');

    expect(url.endsWith('?width=400')).toBe(true);
  });

  it('is deterministic — same input produces same output', () => {
    const path = 'household-id/dish-id.jpg';
    const url1 = getThumbnailUrl(path);
    const url2 = getThumbnailUrl(path);

    expect(url1).toBe(url2);
  });

  it('handles paths with nested directories', () => {
    const url = getThumbnailUrl('hh-001/sub/dish-789.jpeg');

    expect(url).toBe(
      'https://test-project.supabase.co/storage/v1/render/image/authenticated/dish-photos/hh-001/sub/dish-789.jpeg?width=400'
    );
  });
});
