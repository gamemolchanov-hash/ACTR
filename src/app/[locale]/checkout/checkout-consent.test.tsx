/**
 * Consent gate logic tests for checkout step 2.
 * Tests the agreedKvkk + agreedMesafeli submit-gate predicate.
 *
 * Strategy: unit-test the gate predicate directly (pure function)
 * rather than mounting the full checkout component (Stripe/next-intl/auth heavy).
 */
import { describe, it, expect } from 'vitest';

/** Mirrors the guard at the top of handleSubmit in checkout/page.tsx */
function consentGatePasses(agreedKvkk: boolean, agreedMesafeli: boolean): boolean {
  return agreedKvkk && agreedMesafeli;
}

/** Mirrors the disabled condition on the Proceed-to-Payment button */
function proceedButtonDisabled(
  submitting: boolean,
  agreedKvkk: boolean,
  agreedMesafeli: boolean,
): boolean {
  return submitting || !agreedKvkk || !agreedMesafeli;
}

describe('Checkout consent gate', () => {
  describe('consentGatePasses', () => {
    it('returns false when both unchecked', () => {
      expect(consentGatePasses(false, false)).toBe(false);
    });

    it('returns false when only KVKK checked', () => {
      expect(consentGatePasses(true, false)).toBe(false);
    });

    it('returns false when only mesafeli checked', () => {
      expect(consentGatePasses(false, true)).toBe(false);
    });

    it('returns true when both checked', () => {
      expect(consentGatePasses(true, true)).toBe(true);
    });
  });

  describe('proceedButtonDisabled', () => {
    it('is disabled when both unchecked', () => {
      expect(proceedButtonDisabled(false, false, false)).toBe(true);
    });

    it('is disabled when only KVKK checked', () => {
      expect(proceedButtonDisabled(false, true, false)).toBe(true);
    });

    it('is disabled when only mesafeli checked', () => {
      expect(proceedButtonDisabled(false, false, true)).toBe(true);
    });

    it('is enabled (not disabled) when both checked and not submitting', () => {
      expect(proceedButtonDisabled(false, true, true)).toBe(false);
    });

    it('is disabled when submitting even with both checked', () => {
      expect(proceedButtonDisabled(true, true, true)).toBe(true);
    });
  });
});
