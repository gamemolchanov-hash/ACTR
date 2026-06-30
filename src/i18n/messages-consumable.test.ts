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
});
