/**
 * GAP 1 regression: next-intl rejects flat dotted keys (IntlError INVALID_KEY).
 * Verifies that:
 *  - unflatten() produces no top-level key containing '.'
 *  - a real createTranslator (not mocked) resolves representative keys correctly
 * Covers both EN and TR locales.
 */
import { describe, it, expect } from 'vitest';
import { createTranslator } from 'next-intl';
import { unflatten } from './request';
import enRaw from '../../messages/en.json';
import trRaw from '../../messages/tr.json';

describe('messages are next-intl-consumable (unflatten invariant)', () => {
  it('unflattened EN has no top-level key containing "."', () => {
    const nested = unflatten(enRaw as Record<string, string>);
    const dotKeys = Object.keys(nested).filter((k) => k.includes('.'));
    expect(dotKeys).toEqual([]);
  });

  it('unflattened TR has no top-level key containing "."', () => {
    const nested = unflatten(trRaw as Record<string, string>);
    const dotKeys = Object.keys(nested).filter((k) => k.includes('.'));
    expect(dotKeys).toEqual([]);
  });

  it('EN nav.catalog resolves to "Catalog" via real createTranslator', async () => {
    const messages = unflatten(enRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'en', messages })) as unknown as (
      key: string,
    ) => string;
    expect(t('nav.catalog')).toBe('Catalog');
  });

  it('EN legal.kvkk.title resolves to non-empty non-key-string', async () => {
    const messages = unflatten(enRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'en', messages })) as unknown as (
      key: string,
    ) => string;
    const val = t('legal.kvkk.title');
    expect(val).not.toBe('legal.kvkk.title');
    expect(val.length).toBeGreaterThan(0);
  });

  it('EN checkout.consent.required resolves to non-empty non-key-string', async () => {
    const messages = unflatten(enRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'en', messages })) as unknown as (
      key: string,
    ) => string;
    const val = t('checkout.consent.required');
    expect(val).not.toBe('checkout.consent.required');
    expect(val.length).toBeGreaterThan(0);
  });

  it('TR price.kdvDahil resolves to "KDV Dahil"', async () => {
    const messages = unflatten(trRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'tr', messages })) as unknown as (
      key: string,
    ) => string;
    expect(t('price.kdvDahil')).toBe('KDV Dahil');
  });

  it('TR legal.kvkk.title resolves to non-empty non-key-string', async () => {
    const messages = unflatten(trRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'tr', messages })) as unknown as (
      key: string,
    ) => string;
    const val = t('legal.kvkk.title');
    expect(val).not.toBe('legal.kvkk.title');
    expect(val.length).toBeGreaterThan(0);
  });

  it('TR checkout.consent.required resolves to non-empty non-key-string', async () => {
    const messages = unflatten(trRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'tr', messages })) as unknown as (
      key: string,
    ) => string;
    const val = t('checkout.consent.required');
    expect(val).not.toBe('checkout.consent.required');
    expect(val.length).toBeGreaterThan(0);
  });

  // FBG-427 pre-launch "coming soon" price copy — present and translated in both locales.
  it('EN prelaunch.comingSoon resolves to "Coming soon"', async () => {
    const messages = unflatten(enRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'en', messages })) as unknown as (
      key: string,
    ) => string;
    expect(t('prelaunch.comingSoon')).toBe('Coming soon');
  });

  it('TR prelaunch.comingSoon resolves to "Yakında satışta"', async () => {
    const messages = unflatten(trRaw as Record<string, string>);
    const t = (await createTranslator({ locale: 'tr', messages })) as unknown as (
      key: string,
    ) => string;
    expect(t('prelaunch.comingSoon')).toBe('Yakında satışta');
  });

  // FBG-401 "Sözleşmeler ve Formlar" block chrome — present in both locales.
  it.each([
    ['en', enRaw],
    ['tr', trRaw],
  ])('%s checkout.obf.* keys resolve in both locales', async (locale, raw) => {
    const messages = unflatten(raw as Record<string, string>);
    const t = (await createTranslator({ locale, messages })) as unknown as (
      key: string,
    ) => string;
    for (const key of ['checkout.obf.title', 'checkout.obf.close']) {
      const val = t(key);
      expect(val).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
  });

  // FBG-410 ticari elektronik ileti — the pages read these through the nested
  // namespaces `ticariIleti` and `account.prefs`, so the flat keys must survive
  // unflatten() without colliding with the plain `account.*` strings.
  it.each([
    ['en', enRaw],
    ['tr', trRaw],
  ])('%s ticari ileti keys resolve in both locales', async (locale, raw) => {
    const messages = unflatten(raw as Record<string, string>);
    const t = (await createTranslator({ locale, messages })) as unknown as (
      key: string,
    ) => string;
    for (const key of [
      'ticariIleti.emailLabel',
      'ticariIleti.saveError',
      'account.prefs.title',
      'account.prefs.menuLabel',
      'account.breadcrumb',
    ]) {
      const val = t(key);
      expect(val).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
  });

  // FBG-477 üyelik consent + the post-order account notice — both locales, and
  // `checkout.account.createdSent` must interpolate the buyer's address.
  it.each([
    ['en', enRaw],
    ['tr', trRaw],
  ])('%s guest-account checkout keys resolve in both locales', async (locale, raw) => {
    const messages = unflatten(raw as Record<string, string>);
    const t = (await createTranslator({ locale, messages })) as unknown as (
      key: string,
      values?: Record<string, unknown>,
    ) => string;
    for (const key of [
      'checkout.consent.uyelikPrefix',
      'checkout.consent.uyelikLink',
      'checkout.consent.uyelikSuffix',
      'checkout.consent.uyelikRequired',
      'checkout.consent.emailRequired',
      'checkout.account.createdPending',
      'checkout.account.emailTaken',
      'checkout.account.loginCta',
      'checkout.errors.invalid_email',
      'checkout.errors.paymentSessionFailed',
      'checkout.errors.ownerSignInRequired',
      'checkout.pendingOrder.notice',
    ]) {
      const val = t(key);
      expect(val).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
    expect(t('checkout.account.createdSent', { email: 'ada@example.com' })).toContain(
      'ada@example.com',
    );
  });
});
