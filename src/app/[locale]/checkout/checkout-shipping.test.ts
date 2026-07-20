/**
 * FBG-393: honest shipping-unavailable copy.
 *
 * - shippingErrorKey maps each known reason to its own i18n key and any
 *   unknown/absent reason to a generic key (a raw reason must never reach the UI).
 * - every shipping key it can emit is present and non-empty in BOTH locales
 *   (en + tr) — there is no linter for locale parity, so this test is the guard.
 */
import { describe, it, expect } from 'vitest';
import { shippingErrorKey, shippingPanelState, SHIPPING_UNAVAILABLE_REASONS } from '@/lib/checkout';
import enRaw from '../../../../messages/en.json';
import trRaw from '../../../../messages/tr.json';

const en = enRaw as Record<string, string>;
const tr = trRaw as Record<string, string>;

const GENERIC_KEY = 'checkout.shipping.unavailable_generic';

describe('shippingErrorKey', () => {
  it('maps each known reason to its own checkout.shipping.<reason> key', () => {
    for (const reason of SHIPPING_UNAVAILABLE_REASONS) {
      expect(shippingErrorKey(reason)).toBe(`checkout.shipping.${reason}`);
    }
  });

  it('falls back to the generic key for an unknown reason', () => {
    expect(shippingErrorKey('teapot')).toBe(GENERIC_KEY);
  });

  it('falls back to the generic key for null / undefined / non-string', () => {
    expect(shippingErrorKey(null)).toBe(GENERIC_KEY);
    expect(shippingErrorKey(undefined)).toBe(GENERIC_KEY);
    expect(shippingErrorKey(42)).toBe(GENERIC_KEY);
  });

  it("maps the client 'unknown' sentinel to the generic key (honest, not transient)", () => {
    // Empty rates with no BFF reason are stored as 'unknown' → generic copy,
    // never the transient "try again" line (FBG-393 review).
    expect(shippingErrorKey('unknown')).toBe(GENERIC_KEY);
  });
});

describe('shippingPanelState — pending is not a failure', () => {
  it("returns 'pending' on the pre-fetch window (no rates, no error, not loading)", () => {
    // First paint of step 2 before the effect fires: must NOT flash the alert.
    expect(shippingPanelState({ loading: false, hasError: false, ratesCount: 0 })).toBe('pending');
  });

  it("returns 'pending' while the request is in flight", () => {
    expect(shippingPanelState({ loading: true, hasError: false, ratesCount: 0 })).toBe('pending');
  });

  it("returns 'error' only once a failure has resolved", () => {
    expect(shippingPanelState({ loading: false, hasError: true, ratesCount: 0 })).toBe('error');
  });

  it("returns 'rates' when rates are available and there is no error", () => {
    expect(shippingPanelState({ loading: false, hasError: false, ratesCount: 3 })).toBe('rates');
  });

  it("keeps showing the spinner (not the alert) while loading even if a stale error lingers", () => {
    expect(shippingPanelState({ loading: true, hasError: true, ratesCount: 0 })).toBe('pending');
  });
});

describe('shipping copy exists in both locales', () => {
  const keys = [
    ...SHIPPING_UNAVAILABLE_REASONS.map((r) => `checkout.shipping.${r}`),
    GENERIC_KEY,
    'checkout.shipping.tbd',
    'checkout.shipping.selectPrompt',
  ];

  for (const key of keys) {
    it(`${key} is present and non-empty in en + tr`, () => {
      expect(en[key]?.trim()).toBeTruthy();
      expect(tr[key]?.trim()).toBeTruthy();
    });
  }

  it('invalid_postal_code keeps the {zip} placeholder in both locales', () => {
    expect(en['checkout.shipping.invalid_postal_code']).toContain('{zip}');
    expect(tr['checkout.shipping.invalid_postal_code']).toContain('{zip}');
  });

  it('not_configured / network copy never directs users to contact us (placeholder contacts)', () => {
    // /contacts legal fields are placeholders (FBG-393 §7) — these two reasons
    // must not send users there.
    for (const key of ['checkout.shipping.not_configured', 'checkout.shipping.network']) {
      expect(en[key].toLowerCase()).not.toContain('contact us');
      expect(tr[key].toLowerCase()).not.toContain('iletişime geç');
    }
  });
});
