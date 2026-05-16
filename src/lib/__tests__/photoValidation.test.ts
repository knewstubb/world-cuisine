import { describe, it, expect } from 'vitest';
import { validatePhotoFile } from '../photoValidation';

function createMockFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('validatePhotoFile', () => {
  it('accepts a valid JPEG file', () => {
    const file = createMockFile('photo.jpg', 1024, 'image/jpeg');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts a valid PNG file', () => {
    const file = createMockFile('photo.png', 5 * 1024 * 1024, 'image/png');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts a valid WebP file', () => {
    const file = createMockFile('photo.webp', 2048, 'image/webp');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts a file exactly at 10MB', () => {
    const file = createMockFile('photo.jpg', 10 * 1024 * 1024, 'image/jpeg');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects a file larger than 10MB', () => {
    const file = createMockFile('photo.jpg', 10 * 1024 * 1024 + 1, 'image/jpeg');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10MB');
  });

  it('rejects a GIF file', () => {
    const file = createMockFile('animation.gif', 1024, 'image/gif');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Accepted formats');
  });

  it('rejects a PDF file', () => {
    const file = createMockFile('document.pdf', 1024, 'application/pdf');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Accepted formats');
  });

  it('rejects a file with empty MIME type', () => {
    const file = createMockFile('unknown', 1024, '');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Accepted formats');
  });

  it('checks MIME type before size', () => {
    // A file that is both invalid type AND too large should report format error
    const file = createMockFile('big.gif', 20 * 1024 * 1024, 'image/gif');
    const result = validatePhotoFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Accepted formats');
  });
});
