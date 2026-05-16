export interface PhotoValidationResult {
  valid: boolean;
  error?: string;
}

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validates a photo file for acceptable format and size.
 * Accepts only JPEG, PNG, and WebP images up to 10MB.
 */
export function validatePhotoFile(file: File): PhotoValidationResult {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Invalid file format. Accepted formats: JPEG, PNG, WebP.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large. Maximum size is 10MB.`,
    };
  }

  return { valid: true };
}
