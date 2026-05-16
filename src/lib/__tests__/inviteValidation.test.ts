import { describe, it, expect } from 'vitest';
import {
  generateInviteCode,
  getInviteExpiryTimestamp,
  validateInvite,
} from '../inviteValidation';

describe('inviteValidation', () => {
  describe('generateInviteCode', () => {
    it('returns a UUID string', () => {
      const code = generateInviteCode();
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(code).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('generates unique codes', () => {
      const code1 = generateInviteCode();
      const code2 = generateInviteCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('getInviteExpiryTimestamp', () => {
    it('returns an ISO 8601 timestamp 48 hours in the future', () => {
      const before = Date.now();
      const expiry = getInviteExpiryTimestamp();
      const after = Date.now();

      const expiryMs = new Date(expiry).getTime();
      const fortyEightHoursMs = 48 * 60 * 60 * 1000;

      expect(expiryMs).toBeGreaterThanOrEqual(before + fortyEightHoursMs);
      expect(expiryMs).toBeLessThanOrEqual(after + fortyEightHoursMs);
    });

    it('returns a valid ISO string', () => {
      const expiry = getInviteExpiryTimestamp();
      expect(new Date(expiry).toISOString()).toBe(expiry);
    });
  });

  describe('validateInvite', () => {
    it('returns valid for a non-expired invite with room in household', () => {
      const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const result = validateInvite(futureExpiry, 1);
      expect(result).toEqual({ valid: true });
    });

    it('rejects when expiresAt is null (already used)', () => {
      const result = validateInvite(null, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/already been used|invalid/i);
    });

    it('rejects when invite has expired (Req 8.4)', () => {
      const pastExpiry = new Date(Date.now() - 1000).toISOString();
      const result = validateInvite(pastExpiry, 1);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });

    it('rejects when household already has 2 members (Req 8.8)', () => {
      const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const result = validateInvite(futureExpiry, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/full/i);
    });

    it('rejects when household has more than 2 members', () => {
      const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const result = validateInvite(futureExpiry, 3);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/full/i);
    });

    it('accepts invite that expires exactly at the boundary (not yet expired)', () => {
      const now = new Date('2024-06-15T12:00:00.000Z');
      const expiresAt = '2024-06-15T12:00:01.000Z'; // 1 second in the future
      const result = validateInvite(expiresAt, 0, now);
      expect(result.valid).toBe(true);
    });

    it('rejects invite that expired exactly at the boundary', () => {
      const now = new Date('2024-06-15T12:00:01.000Z');
      const expiresAt = '2024-06-15T12:00:00.000Z'; // 1 second in the past
      const result = validateInvite(expiresAt, 0, now);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/expired/i);
    });

    it('uses injectable now parameter for testing', () => {
      const expiresAt = '2024-06-15T12:00:00.000Z';
      const beforeExpiry = new Date('2024-06-15T11:00:00.000Z');
      const afterExpiry = new Date('2024-06-15T13:00:00.000Z');

      expect(validateInvite(expiresAt, 1, beforeExpiry).valid).toBe(true);
      expect(validateInvite(expiresAt, 1, afterExpiry).valid).toBe(false);
    });
  });
});
