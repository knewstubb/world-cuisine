/**
 * Invite code validation utilities for household join flow.
 * Requirements: 8.4 (invite expires after 48 hours or single use), 8.8 (max 2 members)
 */

const INVITE_EXPIRY_HOURS = 48;

/**
 * Generates a UUID-based invite code.
 */
export function generateInviteCode(): string {
  return crypto.randomUUID();
}

/**
 * Calculates the expiry timestamp for a new invite (48 hours from now).
 */
export function getInviteExpiryTimestamp(): string {
  const expiry = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
  return expiry.toISOString();
}

export interface InviteValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates whether an invite is still valid based on expiry time and usage.
 * @param expiresAt - ISO 8601 timestamp of when the invite expires
 * @param currentMemberCount - Number of current members in the household
 * @param now - Current time (injectable for testing)
 */
export function validateInvite(
  expiresAt: string | null,
  currentMemberCount: number,
  now: Date = new Date()
): InviteValidationResult {
  // No expiry set means invite code is invalid/used
  if (!expiresAt) {
    return { valid: false, error: 'This invite code has already been used or is invalid.' };
  }

  // Check expiry (48 hours)
  const expiryDate = new Date(expiresAt);
  if (now > expiryDate) {
    return { valid: false, error: 'This invite code has expired.' };
  }

  // Check household member cap (max 2)
  if (currentMemberCount >= 2) {
    return { valid: false, error: 'This household is full (maximum 2 members).' };
  }

  return { valid: true };
}
