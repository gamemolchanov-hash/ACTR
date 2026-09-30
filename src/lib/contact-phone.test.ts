import { describe, it, expect } from 'vitest';

import { telHref, whatsappHref } from './contact-phone';

describe('contact phone links', () => {
  it('builds tel: and wa.me links from the digits of the typed phone', () => {
    expect(telHref('+90 531 871 30 07')).toBe('tel:+905318713007');
    expect(whatsappHref('+90 531 871 30 07')).toBe('https://wa.me/905318713007');
  });

  it('ignores punctuation Portal users type', () => {
    expect(telHref('+90 (531) 871-30-07')).toBe('tel:+905318713007');
  });

  it.each([null, undefined, '', '   ', '+90'])('gives no link for %j', (phone) => {
    expect(telHref(phone)).toBeNull();
    expect(whatsappHref(phone)).toBeNull();
  });
});
