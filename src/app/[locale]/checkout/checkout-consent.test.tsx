/**
 * Consent + shipping gate logic tests for checkout step 2.
 *
 * Strategy: unit-test the gate predicates directly (pure functions) rather than
 * mounting the full checkout component (Stripe/next-intl/auth heavy). The
 * Proceed-to-Payment predicate is imported from @/lib/checkout — the SAME
 * function the page uses — so this mirror can't drift out of sync (FBG-393).
 */
import { describe, it, expect } from 'vitest';
import { proceedButtonDisabled } from '@/lib/checkout';

/** Mirrors the consent guard at the top of handleSubmit in checkout/page.tsx */
function consentGatePasses(agreedKvkk: boolean, agreedMesafeli: boolean): boolean {
  return agreedKvkk && agreedMesafeli;
}

/** Both consents given + a rate selected + not submitting → button enabled. */
const READY = {
  submitting: false,
  agreedKvkk: true,
  agreedMesafeli: true,
  selectedRateId: 'economy',
};

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
    it('is disabled when both consents unchecked', () => {
      expect(
        proceedButtonDisabled({ ...READY, agreedKvkk: false, agreedMesafeli: false }),
      ).toBe(true);
    });

    it('is disabled when only KVKK checked', () => {
      expect(proceedButtonDisabled({ ...READY, agreedMesafeli: false })).toBe(true);
    });

    it('is disabled when only mesafeli checked', () => {
      expect(proceedButtonDisabled({ ...READY, agreedKvkk: false })).toBe(true);
    });

    it('is disabled when no shipping rate is selected (server zero-cost guard mirror)', () => {
      expect(proceedButtonDisabled({ ...READY, selectedRateId: '' })).toBe(true);
    });

    it('is enabled (not disabled) when consents given, a rate selected, not submitting', () => {
      expect(proceedButtonDisabled(READY)).toBe(false);
    });

    it('treats a selected free rate (price 0 / is_free) as a valid selection', () => {
      // A free rate still has a non-empty id; the gate keys off the id, not price.
      expect(proceedButtonDisabled({ ...READY, selectedRateId: 'economy-free' })).toBe(false);
    });

    it('is disabled when submitting even with consents + rate', () => {
      expect(proceedButtonDisabled({ ...READY, submitting: true })).toBe(true);
    });
  });
});
