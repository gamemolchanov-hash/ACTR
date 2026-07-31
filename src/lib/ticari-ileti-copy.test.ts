/**
 * FBG-410 anti-drift: the consent declarations (canon §15) and the post-save
 * messages (canon §17) must be shown VERBATIM, so they are compared against the
 * published document itself — `TICARI_ELEKTRONIK_ILETI_MARKDOWN`, the same
 * source /legal/ticari-elektronik-ileti renders. Editing either copy without the
 * other now fails here.
 *
 * EN carries the SAME Turkish strings on purpose: these are the legal
 * declaration recorded under a server-pinned `text_version`
 * (KK-ET-TEI-2026-V2), and canon §14 makes the Turkish text prevail over any
 * translation. Only the surrounding chrome is translated.
 *
 * This is the one place the real message catalogs are asserted — the RTL page
 * tests mock next-intl and can only see key names.
 */
import { describe, it, expect } from 'vitest';
import { TICARI_ELEKTRONIK_ILETI_MARKDOWN } from '../app/[locale]/legal/ticari-elektronik-ileti-content';
import en from '../../messages/en.json';
import tr from '../../messages/tr.json';

const catalogs = { en: en as Record<string, string>, tr: tr as Record<string, string> };

/** The §15 declarations, as the canon lists them (checkbox marker stripped). */
const declarations = TICARI_ELEKTRONIK_ILETI_MARKDOWN.split('\n')
  .filter((l) => l.startsWith('☐ '))
  .map((l) => l.slice('☐ '.length));

/** Right-hand cell of a §17 table row keyed by its left-hand label. */
function canonMessage(label: string): string {
  const row = TICARI_ELEKTRONIK_ILETI_MARKDOWN.split('\n').find((l) =>
    l.startsWith(`| ${label} |`),
  );
  return (row ?? '').split('|')[2].trim();
}

describe('canon §15 — consent declarations', () => {
  it('publishes exactly the four channel declarations', () => {
    expect(declarations).toHaveLength(4);
  });

  it.each([
    ['emailLabel', 0],
    ['smsLabel', 1],
    ['aramaLabel', 2],
    ['whatsappLabel', 3],
  ])('%s matches the canon line in both locales', (key, index) => {
    expect(declarations[index].length).toBeGreaterThan(0);
    expect(catalogs.tr[`ticariIleti.${key}`]).toBe(declarations[index]);
    expect(catalogs.en[`ticariIleti.${key}`]).toBe(declarations[index]);
  });

  it('keeps the WhatsApp declaration free of the "I reviewed the notice" clause', () => {
    // The canon WhatsApp text says something different (İYS MESAJ management);
    // splicing the e-posta/SMS wording into it would misquote the document.
    expect(catalogs.tr['ticariIleti.whatsappLabel']).not.toContain('inceledim');
    expect(catalogs.tr['ticariIleti.whatsappLabel']).toContain('İYS');
  });
});

describe('canon §17 — messages after a preference change', () => {
  it.each([
    ['savedEmail', 'E-posta onayı verildi'],
    ['savedMesaj', 'Mesaj onayı verildi'],
    ['savedArama', 'Arama onayı verildi'],
    ['channelOff', 'Bir kanal kapatıldı'],
    ['allOff', 'Tüm kanallar kapatıldı'],
    ['saveError', 'Kayıt hatası'],
  ])('%s matches the canon row "%s" in both locales', (key, row) => {
    const expected = canonMessage(row);
    expect(expected.length).toBeGreaterThan(0);
    expect(catalogs.tr[`ticariIleti.${key}`]).toBe(expected);
    expect(catalogs.en[`ticariIleti.${key}`]).toBe(expected);
  });
});

describe('surrounding chrome', () => {
  it.each([
    'ticariIleti.heading',
    'ticariIleti.optional',
    'ticariIleti.noticeLink',
    'ticariIleti.phoneIncomplete',
    'ticariIleti.contactRequired',
    'account.prefs.title',
    'account.prefs.breadcrumb',
    'account.prefs.menuLabel',
    'account.prefs.menuDesc',
    'account.prefs.subtitle',
    'account.prefs.noChannels',
    'account.prefs.loadError',
    'account.prefs.retry',
    'account.prefs.phoneMissing',
    'account.prefs.phoneMissingLink',
  ])('%s exists in both locales', (key) => {
    expect(catalogs.en[key]?.length).toBeGreaterThan(0);
    expect(catalogs.tr[key]?.length).toBeGreaterThan(0);
  });
});
